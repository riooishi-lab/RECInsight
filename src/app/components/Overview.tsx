import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "./ui/skeleton";
import { Users, Video, Eye, TrendingUp, Clock, Sparkles } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Phase } from "../../lib/supabase";

const PHASES: Phase[] = ["認知", "興味", "応募", "選定", "内定", "承諾"];
const COLORS = ["#5CA7D1", "#7DBDDD", "#0079B3", "#5CA7D1", "#7DBDDD", "#0079B3"];

type PhaseFilter = "全体" | Phase;

// フェーズセレクターコンポーネント
function PhaseSelector({
  value,
  onChange,
}: {
  value: PhaseFilter;
  onChange: (v: PhaseFilter) => void;
}) {
  const options: PhaseFilter[] = ["全体", ...PHASES];
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PhaseFilter)}
      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

interface RawData {
  students: { id: string; phase: Phase }[];
  playEvents: { student_id: string; video_id: string; videos: { category: string | null } | null }[];
  heartbeatEvents: { student_id: string; video_id: string; videos: { category: string | null } | null }[];
  totalVideos: number;
}

export function Overview({ companyId }: { companyId: string }) {
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<RawData>({
    students: [],
    playEvents: [],
    heartbeatEvents: [],
    totalVideos: 0,
  });

  // フェーズフィルター（ダッシュボード全体に共通）
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("全体");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const { count: videoCount } = await supabase.from('videos').select('*', { count: 'exact', head: true }).eq('company_id', companyId);

      const { data: events } = await supabase
        .from('watch_events')
        .select('student_id, event_type, video_id, videos(category)')
        .eq('company_id', companyId);

      const { data: studentPhases } = await supabase.from('students').select('id, phase').eq('company_id', companyId);

      const playEvents = events?.filter(e => e.event_type === 'play') || [];
      const heartbeatEvents = events?.filter(e => e.event_type === 'heartbeat') || [];

      setRawData({
        students: (studentPhases || []) as { id: string; phase: Phase }[],
        playEvents: playEvents as any[],
        heartbeatEvents: heartbeatEvents as any[],
        totalVideos: videoCount || 0,
      });
      setLoading(false);
    }

    fetchData();

    const channel = supabase
      .channel('overview-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watch_events' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  // フィルター適用済みの統計を計算
  const stats = useMemo(() => {
    const { students, playEvents, heartbeatEvents, totalVideos } = rawData;

    const filteredStudentIds = phaseFilter === "全体"
      ? new Set(students.map(s => s.id))
      : new Set(students.filter(s => s.phase === phaseFilter).map(s => s.id));

    const filteredPlays = playEvents.filter(e => filteredStudentIds.has(e.student_id));
    const filteredHeartbeats = heartbeatEvents.filter(e => filteredStudentIds.has(e.student_id));

    const totalStudents = filteredStudentIds.size;
    const totalViews = filteredPlays.length;
    const totalWatchSec = filteredHeartbeats.length * 30;
    const totalWatchTimeMin = Math.floor(totalWatchSec / 60);
    const avgViewsPerStudent = totalStudents > 0 ? (totalViews / totalStudents).toFixed(1) : "0.0";
    const avgWatchTimePerStudent = totalStudents > 0 ? Math.floor(totalWatchTimeMin / totalStudents) : 0;

    // フェーズ別学生数（全体表示時のみ全フェーズ表示）
    const phaseMap = students.reduce((acc, s) => {
      acc[s.phase] = (acc[s.phase] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const phaseData = PHASES.map(p => ({ フェーズ: p, 学生数: phaseMap[p] || 0 }));

    // カテゴリ別（フィルター済み）
    const catCountMap: Record<string, number> = {};
    const catTimeMap: Record<string, number> = {};

    filteredPlays.forEach((e: any) => {
      const cat = e.videos?.category || "未分類";
      catCountMap[cat] = (catCountMap[cat] || 0) + 1;
    });
    filteredHeartbeats.forEach((e: any) => {
      const cat = e.videos?.category || "未分類";
      catTimeMap[cat] = (catTimeMap[cat] || 0) + 30;
    });

    const categoryData = Object.entries(catCountMap).map(([name, count]) => ({ name, 視聴回数: count }));
    const categoryWatchTimeData = Object.entries(catTimeMap).map(([name, sec]) => ({ name, 視聴時間: Math.floor(sec / 60) }));

    // フェーズ別視聴傾向
    const phaseTrends = PHASES.map(phase => {
      const studentsInPhase = students.filter(s => s.phase === phase);
      const studentIdsInPhase = new Set(studentsInPhase.map(s => s.id));
      const phasePlays = playEvents.filter(e => studentIdsInPhase.has(e.student_id));
      const phaseHeartbeats = heartbeatEvents.filter(e => studentIdsInPhase.has(e.student_id));
      const uniqueVideos = new Set(phasePlays.map(e => e.video_id)).size;
      return {
        phase,
        studentCount: studentsInPhase.length,
        avgVideos: studentsInPhase.length > 0 ? (uniqueVideos / studentsInPhase.length).toFixed(1) : "0.0",
        totalViews: phasePlays.length,
        totalTime: Math.floor((phaseHeartbeats.length * 30) / 60),
      };
    });

    return {
      totalStudents,
      totalVideos,
      totalViews,
      totalWatchTimeMin,
      avgViewsPerStudent,
      avgWatchTimePerStudent,
      phaseData,
      categoryData,
      categoryWatchTimeData,
      phaseTrends,
    };
  }, [rawData, phaseFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ページタイトル + フェーズフィルター */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold">全体概要</h2>
          <p className="text-gray-500 mt-1">採用活動全体の統計とインサイト</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-gray-500">表示フェーズ：</span>
          <PhaseSelector value={phaseFilter} onChange={setPhaseFilter} />
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総学生数</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}名</div>
            <p className="text-xs text-gray-500 mt-1">
              {phaseFilter === "全体" ? `${PHASES.length}つのフェーズに分散` : `${phaseFilter}フェーズ`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">動画本数</CardTitle>
            <Video className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVideos}本</div>
            <p className="text-xs text-gray-500 mt-1">登録済みの動画マスタ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総視聴回数</CardTitle>
            <Eye className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}回</div>
            <p className="text-xs text-gray-500 mt-1">全動画の合計</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総視聴時間</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWatchTimeMin}分</div>
            <p className="text-xs text-gray-500 mt-1">全動画の合計</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">学生平均</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgViewsPerStudent}回</div>
            <p className="text-xs text-gray-500 mt-1">{stats.avgWatchTimePerStudent}分/人</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* フェーズ別学生分布 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>フェーズ別学生分布</CardTitle>
              <CardDescription>各採用フェーズに在籍している学生数</CardDescription>
            </div>
            <PhaseSelector value={phaseFilter} onChange={setPhaseFilter} />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.phaseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="フェーズ" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="学生数" fill={phaseFilter === "全体" ? "#5CA7D1" : "#0079B3"} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* カテゴリ別視聴回数 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>カテゴリ別視聴回数</CardTitle>
              <CardDescription>
                どのカテゴリの動画が視聴されているか
                {phaseFilter !== "全体" && <span className="ml-1 text-blue-600">（{phaseFilter}フェーズ）</span>}
              </CardDescription>
            </div>
            <PhaseSelector value={phaseFilter} onChange={setPhaseFilter} />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {stats.categoryData.length > 0 ? (
                <PieChart>
                  <Pie
                    data={stats.categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="視聴回数"
                  >
                    {stats.categoryData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">データがありません</div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* カテゴリ別視聴時間 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>カテゴリ別視聴時間</CardTitle>
              <CardDescription>
                各カテゴリの総視聴時間（分）
                {phaseFilter !== "全体" && <span className="ml-1 text-blue-600">（{phaseFilter}フェーズ）</span>}
              </CardDescription>
            </div>
            <PhaseSelector value={phaseFilter} onChange={setPhaseFilter} />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.categoryWatchTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="視聴時間" fill="#5CA7D1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* カテゴリ別視聴時間（円グラフ） */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>カテゴリ別視聴時間の割合</CardTitle>
              <CardDescription>
                どのカテゴリに時間を費やしているか
                {phaseFilter !== "全体" && <span className="ml-1 text-blue-600">（{phaseFilter}フェーズ）</span>}
              </CardDescription>
            </div>
            <PhaseSelector value={phaseFilter} onChange={setPhaseFilter} />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {stats.categoryWatchTimeData.length > 0 ? (
                <PieChart>
                  <Pie
                    data={stats.categoryWatchTimeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="視聴時間"
                  >
                    {stats.categoryWatchTimeData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">データがありません</div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* フェーズ別の視聴傾向 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>フェーズ別視聴傾向</CardTitle>
            <CardDescription>各フェーズでの平均視聴動画数、総視聴回数、総視聴時間</CardDescription>
          </div>
          <PhaseSelector value={phaseFilter} onChange={setPhaseFilter} />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.phaseTrends
              .filter(trend => phaseFilter === "全体" || trend.phase === phaseFilter)
              .map(trend => (
                <div key={trend.phase} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium text-lg">{trend.phase}フェーズ</div>
                    <div className="text-sm text-gray-500">{trend.studentCount}名の学生</div>
                  </div>
                  <div className="flex gap-8 text-sm">
                    <div className="text-right">
                      <div className="text-gray-500">平均視聴動画数</div>
                      <div className="text-xl font-semibold">{trend.avgVideos}本</div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-500">総視聴回数</div>
                      <div className="text-xl font-semibold">{trend.totalViews}回</div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-500">総視聴時間</div>
                      <div className="text-xl font-semibold">{trend.totalTime}分</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* 分析インサイト - Coming Soon */}
      <Card>
        <CardHeader>
          <CardTitle>分析インサイト</CardTitle>
          <CardDescription>データから得られる示唆</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-[#5CA7D1]" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700">Coming Soon</p>
              <p className="text-sm text-gray-500 mt-1">
                AI連携による分析インサイトは近日公開予定です
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
