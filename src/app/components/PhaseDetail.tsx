import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Eye, Users, Home, Clock } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Phase } from "../../lib/supabase";

type PhaseTab = "all" | string;

export function PhaseDetail() {
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState<PhaseTab>("all");
  const [data, setData] = useState({
    students: [] as any[],
    videos: [] as any[],
    events: [] as any[],
    phaseCounts: {} as Record<string, number>,
  });

  const PHASES: Phase[] = ["認知", "興味", "応募", "選定", "内定", "承諾"];

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: students } = await supabase.from('students').select('*');
      const { data: videos } = await supabase.from('videos').select('*');
      const { data: events } = await supabase.from('watch_events').select('*');

      if (!students || !videos || !events) {
        setLoading(false);
        return;
      }

      const counts: Record<string, number> = {};
      students.forEach(s => {
        counts[s.phase] = (counts[s.phase] || 0) + 1;
      });

      setData({
        students,
        videos,
        events,
        phaseCounts: counts,
      });
      setLoading(false);
    }
    fetchData();
  }, []);

  const getStudentStats = (studentId: string) => {
    const sEvents = data.events.filter(e => e.student_id === studentId);
    const playEvents = sEvents.filter(e => e.event_type === 'play');
    const heartbeats = sEvents.filter(e => e.event_type === 'heartbeat');
    const viewedVideoIds = Array.from(new Set(playEvents.map(e => e.video_id)));

    const videoDetails = viewedVideoIds.map(vid => {
      const video = data.videos.find(v => v.id === vid);
      const count = playEvents.filter(e => e.video_id === vid).length;
      return { title: video?.title || "不明な動画", count };
    });

    const totalSeconds = heartbeats.length * 5;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    return {
      viewedCount: viewedVideoIds.length,
      totalViews: playEvents.length,
      timeStr: hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`,
      videoDetails,
    };
  };

  const filteredStudents = selectedPhase === "all"
    ? data.students
    : data.students.filter(s => s.phase === selectedPhase);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-2 border-b">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-24" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">フェーズ別分析</h1>
        <p className="text-gray-600 mt-2">
          各フェーズの学生の視聴行動を分析します
        </p>
      </div>

      {/* タブナビゲーション */}
      <div className="flex gap-2 border-b overflow-x-auto pb-px">
        <button
          onClick={() => setSelectedPhase("all")}
          className={`px-6 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${selectedPhase === "all"
            ? "border-[#5CA7D1] text-[#5CA7D1]"
            : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
        >
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            <span>全体</span>
            <Badge variant="secondary">{data.students.length}名</Badge>
          </div>
        </button>
        {PHASES.map(phase => {
          const count = data.phaseCounts[phase] || 0;
          return (
            <button
              key={phase}
              onClick={() => setSelectedPhase(phase)}
              className={`px-6 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${selectedPhase === phase
                ? "border-[#5CA7D1] text-[#5CA7D1]"
                : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              <div className="flex items-center gap-2">
                <span>{phase}</span>
                <Badge variant="secondary">{count}名</Badge>
              </div>
            </button>
          );
        })}
      </div>

      {/* フェーズの詳細内容 */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{selectedPhase === "all" ? "全フェーズ" : `${selectedPhase}フェーズ`}の学生</CardTitle>
            <CardDescription>
              {filteredStudents.length}名の学生が在籍しています
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>学生名</TableHead>
                    <TableHead>フェーズ</TableHead>
                    <TableHead>視聴動画数</TableHead>
                    <TableHead>総視聴回数</TableHead>
                    <TableHead>総視聴時間</TableHead>
                    <TableHead>直近の視聴動画</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length > 0 ? filteredStudents.map(student => {
                    const stats = getStudentStats(student.id);
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell><Badge variant="outline">{student.phase}</Badge></TableCell>
                        <TableCell>{stats.viewedCount}本</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-gray-500" />
                            {stats.totalViews}回
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            {stats.timeStr}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[300px]">
                            {stats.videoDetails.map((v, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[10px] py-0">
                                {v.title} ({v.count})
                              </Badge>
                            ))}
                            {stats.videoDetails.length === 0 && <span className="text-gray-400 text-xs">なし</span>}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-gray-400">学生データがありません</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selectedPhase === "all" ? "全フェーズ" : `${selectedPhase}フェーズ`}の動画視聴普及率</CardTitle>
            <CardDescription>
              ターゲット学生のうち何人が視聴したか
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.videos.map(video => {
                const phasePlays = data.events.filter(e =>
                  e.video_id === video.id &&
                  e.event_type === 'play' &&
                  (selectedPhase === "all" || data.students.find(s => s.id === e.student_id)?.phase === selectedPhase)
                );

                const uniqueViewers = Array.from(new Set(phasePlays.map(e => e.student_id))).length;
                const denominator = filteredStudents.length;
                const percentage = denominator > 0 ? (uniqueViewers / denominator) * 100 : 0;

                if (uniqueViewers === 0 && selectedPhase !== "all") return null;

                return (
                  <div key={video.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{video.title}</div>
                        <div className="text-xs text-gray-500">
                          {video.category} / {video.subcategory}
                        </div>
                      </div>
                      <div className="text-xs font-medium">
                        {uniqueViewers}人 ({percentage.toFixed(0)}%)
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#5CA7D1] transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {data.videos.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">動画データがありません</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}