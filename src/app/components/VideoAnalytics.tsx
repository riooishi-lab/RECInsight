import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Skeleton } from "./ui/skeleton";
import { Clock, Eye, Play } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Phase } from "../../lib/supabase";

export function VideoAnalytics() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    videoData: [] as any[],
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
      const { data: students } = await supabase.from('students').select('id, phase');

      if (!videos || !events || !students) {
        setLoading(false);
        return;
      }

      const studentToPhase = Object.fromEntries(students.map(s => [s.id, s.phase]));

      // 1. 動画ごとの統計
      const videoStats = videos.map(v => {
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

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
        <p className="text-gray-500 mt-1">
          動画コンテンツのパフォーマンスを詳細に分析
        </p>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Play className="h-4 w-4" />
              総動画数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.statsSummary.totalVideos}本</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              総視聴回数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.statsSummary.totalViews}回
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              総視聴時間
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.statsSummary.totalWatchTime}分
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              平均視聴時間/動画
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.statsSummary.avgWatchTime}分
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>動画別視聴統計</CardTitle>
          <CardDescription>
            全ての学生の動画視聴データ（視聴回数と視聴時間）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            {data.videoData.length > 0 ? (
              <BarChart data={data.videoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  interval={0}
                  style={{ fontSize: '11px' }}
                />
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
          <CardDescription>
            各採用フェーズでどのカテゴリの動画が視聴されているか
          </CardDescription>
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
                <Bar
                  key={phase}
                  dataKey={phase}
                  fill={colors[phase as keyof typeof colors]}
                  stackId="a"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>カテゴリ別・フェーズ別視聴時間</CardTitle>
          <CardDescription>
            各採用フェーズでの視聴時間（分）
          </CardDescription>
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
                <Bar
                  key={phase}
                  dataKey={phase}
                  fill={colors[phase as keyof typeof colors]}
                  stackId="a"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>動画詳細データ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {["目標の魅力", "人材の魅力", "活動の魅力", "条件の魅力"].map(category => (
              <div key={category}>
                <h3 className="font-semibold text-lg mb-3">{category}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.videoData.filter(v => v.category === category).map(v => {
                    const watchRate = v.raw.duration_sec ? (v.totalWatchSec / (v.viewerCount * v.raw.duration_sec) * 100).toFixed(0) : "0";

                    return (
                      <div
                        key={v.raw.id}
                        className="p-4 border rounded-lg bg-gray-50"
                      >
                        <div className="font-medium">{v.name}</div>
                        <div className="text-sm text-gray-500 mb-3">
                          {v.raw.subcategory} • {v.raw.duration_sec ? formatTime(v.raw.duration_sec) : "--:--"}
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
    </div>
  );
}