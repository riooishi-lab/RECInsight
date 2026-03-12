import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "./ui/skeleton";
import { Clock, Eye, Play, Users, Calendar, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Phase } from "../../lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

interface VideoStat {
  name: string;
  category: string;
  視聴者数: number;
  総視聴回数: number;
  総視聴時間: number;
  平均視聴時間: number;
  raw: any;
  viewerCount: number;
  totalViews: number;
  totalWatchSec: number;
}

interface StudentViewer {
  id: string;
  name: string;
  university: string | null;
  department: string | null;
  phase: Phase;
  viewCount: number;
  watchSeconds: number;
  lastWatched: string;
}

interface VideoDetail {
  stat: VideoStat;
  viewers: StudentViewer[];
}

export function VideoAnalytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    videoData: [] as VideoStat[],
    categoryData: [] as any[],
    categoryWatchTimeData: [] as any[],
    videos: [] as any[],
    statsSummary: {
      totalVideos: 0,
      totalViews: 0,
      totalWatchTime: 0,
      avgWatchTime: 0,
    }
  });
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<VideoDetail | null>(null);

  const PHASES: Phase[] = ["認知", "興味", "応募", "選定", "内定", "承諾"];
  const colors = {
    "認知": "#5CA7D1",
    "興味": "#7DBDDD",
    "応募": "#0079B3",
    "選定": "#4A8FB8",
    "内定": "#005a86",
    "承諾": "#7DBDDD",
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const { data: videos } = await supabase.from('videos').select('*');
      const { data: events } = await supabase.from('watch_events').select('*, videos(category)');
      const { data: students } = await supabase.from('students').select('*');

      if (!videos || !events || !students) {
        setLoading(false);
        return;
      }

      setAllEvents(events);
      setAllStudents(students);

      // 1. 動画ごとの統計
      const videoStats: VideoStat[] = videos.map(v => {
        const vEvents = events.filter(e => e.video_id === v.id);
        const playEvents = vEvents.filter(e => e.event_type === 'play');
        const heartbeats = vEvents.filter(e => e.event_type === 'heartbeat');

        const viewerIds = new Set(playEvents.map(e => e.student_id));
        const watchSec = heartbeats.length * 5;
        const totalWatchMin = Math.floor(watchSec / 60);

        return {
          name: v.title,
          category: v.category,
          視聴者数: viewerIds.size,
          総視聴回数: playEvents.length,
          総視聴時間: totalWatchMin,
          平均視聴時間: viewerIds.size > 0 ? Math.floor(totalWatchMin / viewerIds.size) : 0,
          raw: v,
          viewerCount: viewerIds.size,
          totalViews: playEvents.length,
          totalWatchSec: watchSec,
        };
      });

      // 2. カテゴリ x フェーズ の集計
      const categories = ["目標の魅力", "人材の魅力", "活動の魅力", "条件の魅力"];

      const categoryData = categories.map(cat => {
        const res: any = { category: cat };
        PHASES.forEach(phase => {
          const phaseStudentIds = students.filter(s => s.phase === phase).map(s => s.id);
          const catEvents = events.filter(e => e.videos?.category === cat && e.event_type === 'play' && phaseStudentIds.includes(e.student_id));
          res[phase] = catEvents.length;
        });
        return res;
      });

      const categoryWatchTimeData = categories.map(cat => {
        const res: any = { category: cat };
        PHASES.forEach(phase => {
          const phaseStudentIds = students.filter(s => s.phase === phase).map(s => s.id);
          const catHeartbeats = events.filter(e => e.videos?.category === cat && e.event_type === 'heartbeat' && phaseStudentIds.includes(e.student_id));
          res[phase] = Math.floor((catHeartbeats.length * 5) / 60);
        });
        return res;
      });

      const totalViews = videoStats.reduce((sum, v) => sum + v.総視聴回数, 0);
      const totalWatchTime = videoStats.reduce((sum, v) => sum + v.総視聴時間, 0);

      setData({
        videoData: videoStats,
        categoryData,
        categoryWatchTimeData,
        videos,
        statsSummary: {
          totalVideos: videos.length,
          totalViews,
          totalWatchTime,
          avgWatchTime: videos.length > 0 ? Math.floor(totalWatchTime / videos.length) : 0,
        }
      });
      setLoading(false);
    }

    fetchData();
  }, []);

  const openDetail = (stat: VideoStat) => {
    const videoEvents = allEvents.filter(e => e.video_id === stat.raw.id);
    const viewerMap = new Map<string, { viewCount: number; watchSeconds: number; lastWatched: string }>();

    videoEvents.forEach(e => {
      if (!viewerMap.has(e.student_id)) {
        viewerMap.set(e.student_id, { viewCount: 0, watchSeconds: 0, lastWatched: e.created_at });
      }
      const v = viewerMap.get(e.student_id)!;
      if (e.event_type === 'play') v.viewCount += 1;
      if (e.event_type === 'heartbeat') v.watchSeconds += 5;
      if (new Date(e.created_at) > new Date(v.lastWatched)) v.lastWatched = e.created_at;
    });

    const viewers: StudentViewer[] = Array.from(viewerMap.entries())
      .map(([studentId, d]) => {
        const student = allStudents.find(s => s.id === studentId);
        if (!student) return null;
        return {
          id: student.id,
          name: student.name,
          university: student.university,
          department: student.department,
          phase: student.phase,
          viewCount: d.viewCount,
          watchSeconds: d.watchSeconds,
          lastWatched: d.lastWatched,
        };
      })
      .filter((v): v is StudentViewer => v !== null)
      .sort((a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime());

    setSelectedDetail({ stat, viewers });
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("ja-JP", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "認知": return "bg-gray-100 text-gray-700";
      case "興味": return "bg-blue-100 text-blue-700";
      case "応募": return "bg-green-100 text-green-700";
      case "選定": return "bg-orange-100 text-orange-700";
      case "内定": return "bg-red-100 text-red-700";
      case "承諾": return "bg-purple-100 text-purple-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ページタイトル */}
      <div>
        <h2 className="text-3xl font-bold">動画別分析</h2>
        <p className="text-gray-500 mt-1">動画コンテンツのパフォーマンスを詳細に分析</p>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Play className="h-4 w-4" />総動画数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.statsSummary.totalVideos}本</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Eye className="h-4 w-4" />総視聴回数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.statsSummary.totalViews}回</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Clock className="h-4 w-4" />総視聴時間
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.statsSummary.totalWatchTime}分</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Clock className="h-4 w-4" />平均視聴時間/動画
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.statsSummary.avgWatchTime}分</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>動画別視聴統計</CardTitle>
          <CardDescription>全ての学生の動画視聴データ（視聴回数と視聴時間）</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            {data.videoData.length > 0 ? (
              <BarChart data={data.videoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} interval={0} style={{ fontSize: '11px' }} />
                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                <YAxis yAxisId="right" orientation="right" stroke="#0891b2" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="総視聴回数" fill="#3b82f6" name="総視聴回数（回）" />
                <Bar yAxisId="right" dataKey="総視聴時間" fill="#0891b2" name="総視聴時間（分）" />
              </BarChart>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">データがありません</div>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>カテゴリ別・フェーズ別視聴回数</CardTitle>
          <CardDescription>各採用フェーズでどのカテゴリの動画が視聴されているか</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              {PHASES.map(phase => (
                <Bar key={phase} dataKey={phase} fill={colors[phase as keyof typeof colors]} stackId="a" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>カテゴリ別・フェーズ別視聴時間</CardTitle>
          <CardDescription>各採用フェーズでの視聴時間（分）</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.categoryWatchTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              {PHASES.map(phase => (
                <Bar key={phase} dataKey={phase} fill={colors[phase as keyof typeof colors]} stackId="a" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>動画詳細データ</CardTitle>
          <CardDescription>各動画をタップすると視聴した学生の詳細を確認できます</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {["目標の魅力", "人材の魅力", "活動の魅力", "条件の魅力"].map(category => (
              <div key={category}>
                <h3 className="font-semibold text-lg mb-3">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.videoData.filter(v => v.category === category).map(v => {
                    const watchRate = v.raw.duration_sec && v.viewerCount > 0
                      ? (v.totalWatchSec / (v.viewerCount * v.raw.duration_sec) * 100).toFixed(0)
                      : "0";

                    return (
                      <div
                        key={v.raw.id}
                        className="p-4 border rounded-lg bg-gray-50 cursor-pointer hover:shadow-md hover:border-[#5CA7D1] hover:bg-white transition-all"
                        onClick={() => openDetail(v)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{v.name}</div>
                            <div className="text-sm text-gray-500 mb-3">
                              {v.raw.subcategory} • {v.raw.duration_sec ? formatTime(v.raw.duration_sec) : "--:--"}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 mt-1" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">視聴者:</span>{" "}
                              <span className="font-medium">{v.viewerCount}人</span>
                            </div>
                            <div>
                              <span className="text-gray-600">総視聴:</span>{" "}
                              <span className="font-medium">{v.totalViews}回</span>
                            </div>
                            <div>
                              <span className="text-gray-600">平均:</span>{" "}
                              <span className="font-medium">{(v.viewerCount > 0 ? (v.totalViews / v.viewerCount).toFixed(1) : "0")}回</span>
                            </div>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">総視聴時間:</span>{" "}
                              <span className="font-medium">{formatTime(v.totalWatchSec)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">平均視聴:</span>{" "}
                              <span className="font-medium">{v.viewerCount > 0 ? formatTime(v.totalWatchSec / v.viewerCount) : "0:00"}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">視聴率:</span>{" "}
                              <span className="font-medium">{watchRate}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 動画詳細ダイアログ */}
      <Dialog open={selectedDetail !== null} onOpenChange={(open) => !open && setSelectedDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold pr-8">{selectedDetail?.stat.name}</DialogTitle>
          </DialogHeader>
          {selectedDetail && (
            <div className="space-y-5 mt-2">
              <div className="text-sm text-gray-500">
                {selectedDetail.stat.raw.subcategory} • {selectedDetail.stat.raw.duration_sec ? formatTime(selectedDetail.stat.raw.duration_sec) : "--:--"}
              </div>

              {/* サマリー */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center mb-1 text-[#5CA7D1]">
                    <Eye className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{selectedDetail.stat.totalViews}</div>
                  <div className="text-xs text-gray-500">視聴回数</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center mb-1 text-[#5CA7D1]">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{selectedDetail.stat.viewerCount}</div>
                  <div className="text-xs text-gray-500">視聴者数</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center mb-1 text-[#5CA7D1]">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{formatTime(selectedDetail.stat.totalWatchSec)}</div>
                  <div className="text-xs text-gray-500">総視聴時間</div>
                </div>
              </div>

              {/* 視聴した学生一覧 */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  視聴した学生（{selectedDetail.viewers.length}名）
                </h3>
                {selectedDetail.viewers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 border rounded-lg bg-gray-50">
                    まだ視聴した学生はいません
                  </div>
                ) : (
                  <div className="divide-y rounded-lg border overflow-hidden">
                    {selectedDetail.viewers.map((viewer) => (
                      <div key={viewer.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900">{viewer.name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getPhaseColor(viewer.phase)}`}>
                              {viewer.phase}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 truncate">
                            {viewer.university || "—"}{viewer.department ? ` / ${viewer.department}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 shrink-0">
                          <div className="flex items-center gap-1">
                            <Play className="h-3.5 w-3.5 text-gray-400" />
                            <span>{viewer.viewCount}回</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                            <span>{formatTime(viewer.watchSeconds)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(viewer.lastWatched)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
