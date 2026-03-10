import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "./ui/skeleton";
import { Users, Video, Eye, TrendingUp, Clock } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Phase } from "../../lib/supabase";

export function Overview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalVideos: 0,
    totalViews: 0,
    totalWatchTimeMin: 0,
    avgViewsPerStudent: "0.0",
    avgWatchTimePerStudent: 0,
    phaseData: [] as { フェーズ: string; 学生数: number }[],
    categoryData: [] as { name: string; 視聴回数: number }[],
    categoryWatchTimeData: [] as { name: string; 視聴時間: number }[],
    phaseTrends: [] as any[],
  });

  const COLORS = ["#5CA7D1", "#7DBDDD", "#0079B3", "#5CA7D1", "#7DBDDD", "#0079B3"];
  const PHASES: Phase[] = ["認知", "興味", "応募", "選定", "内定", "承諾"];

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // 1. 各種カウント取得
      const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
      const { count: videoCount } = await supabase.from('videos').select('*', { count: 'exact', head: true });

      // 2. 視聴イベント取得（統計用）
      const { data: events } = await supabase
        .from('watch_events')
        .select('student_id, event_type, video_id, videos(category)');

      const totalStudents = studentCount || 0;
      const totalVideos = videoCount || 0;

      const playEvents = events?.filter(e => e.event_type === 'play') || [];
      const heartbeatEvents = events?.filter(e => e.event_type === 'heartbeat') || [];

      const totalViews = playEvents.length;
      const totalWatchSec = heartbeatEvents.length * 5;
      const totalWatchTimeMin = Math.floor(totalWatchSec / 60);

      const avgViewsPerStudent = totalStudents > 0 ? (totalViews / totalStudents).toFixed(1) : "0.0";
      const avgWatchTimePerStudent = totalStudents > 0 ? Math.floor(totalWatchTimeMin / totalStudents) : 0;

      // 3. フェーズ別データの取得
      const { data: studentsByPhase } = await supabase.from('students').select('phase');
      const phaseMap = studentsByPhase?.reduce((acc: any, s) => {
        acc[s.phase] = (acc[s.phase] || 0) + 1;
        return acc;
      }, {}) || {};

      const phaseData = PHASES.map(p => ({
        フェーズ: p,
        学生数: phaseMap[p] || 0,
      }));

      // 4. カテゴリ別データの計算
      const catCountMap: any = {};
      const catTimeMap: any = {};

      playEvents.forEach((e: any) => {
        const cat = e.videos?.category || "未分類";
        catCountMap[cat] = (catCountMap[cat] || 0) + 1;
      });

      heartbeatEvents.forEach((e: any) => {
        const cat = e.videos?.category || "未分類";
        catTimeMap[cat] = (catTimeMap[cat] || 0) + 5;
      });

      const categoryData = Object.entries(catCountMap).map(([name, count]) => ({
        name,
        視聴回数: count as number,
      }));

      const categoryWatchTimeData = Object.entries(catTimeMap).map(([name, sec]) => ({
        name,
        視聴時間: Math.floor((sec as number) / 60),
      }));

      // 5. フェーズ別視聴傾向の抜粋
      // 注意: watch_events に student_id があるので、students テーブルと紐付ける
      const { data: studentPhases } = await supabase.from('students').select('id, phase');
      const studentToPhase: any = {};
      studentPhases?.forEach(s => { studentToPhase[s.id] = s.phase; });

      const phaseTrends = PHASES.map(phase => {
        const studentsInPhase = studentPhases?.filter(s => s.phase === phase) || [];
        const studentIdsInPhase = studentsInPhase.map(s => s.id);

        const phasePlays = playEvents.filter(e => studentIdsInPhase.includes(e.student_id));
        const phaseHeartbeats = heartbeatEvents.filter(e => studentIdsInPhase.includes(e.student_id));

        // ユニークな動画視聴数
        const uniqueVideos = new Set(phasePlays.map(e => e.video_id)).size;

        return {
          phase,
          studentCount: studentsInPhase.length,
          avgVideos: studentsInPhase.length > 0 ? (uniqueVideos / studentsInPhase.length).toFixed(1) : "0.0",
          totalViews: phasePlays.length,
          totalTime: Math.floor((phaseHeartbeats.length * 5) / 60),
        };
      });

      setStats({
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
      });
      setLoading(false);
    }

    fetchData();

    // Supabase Realtimeで変更を購読
    const channel = supabase
      .channel('overview-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'students' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'watch_events' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
      {/* ページタイトル */}
      <div>
        <h2 className="text-3xl font-bold">全体概要</h2>
        <p className="text-gray-500 mt-1">
          採用活動全体の統計とインサイト
        </p>
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
              {PHASES.length}つのフェーズに分散
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
            <p className="text-xs text-gray-500 mt-1">
              登録済みの動画マスタ
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総視聴回数</CardTitle>
            <Eye className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}回</div>
            <p className="text-xs text-gray-500 mt-1">
              全動画の合計
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総視聴時間</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWatchTimeMin}分</div>
            <p className="text-xs text-gray-500 mt-1">
              全動画の合計
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">学生平均</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgViewsPerStudent}回</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.avgWatchTimePerStudent}分/人
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* フェーズ別学生分布 */}
        <Card>
          <CardHeader>
            <CardTitle>フェーズ別学生分布</CardTitle>
            <CardDescription>
              各採用フェーズに在籍している学生数
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.phaseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="フェーズ" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="学生数" fill="#5CA7D1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* カテゴリ別視聴回数 */}
        <Card>
          <CardHeader>
            <CardTitle>カテゴリ別視聴回数</CardTitle>
            <CardDescription>
              どのカテゴリの動画が視聴されているか
            </CardDescription>
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
                    {stats.categoryData.map((entry, index) => (
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
          <CardHeader>
            <CardTitle>カテゴリ別視聴時間</CardTitle>
            <CardDescription>
              各カテゴリの総視聴時間（分）
            </CardDescription>
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
          <CardHeader>
            <CardTitle>カテゴリ別視聴時間の割合</CardTitle>
            <CardDescription>
              どのカテゴリに時間を費やしているか
            </CardDescription>
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
                    {stats.categoryWatchTimeData.map((entry, index) => (
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
        <CardHeader>
          <CardTitle>フェーズ別視聴傾向</CardTitle>
          <CardDescription>
            各フェーズでの平均視聴動画数、総視聴回数、総視聴時間
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.phaseTrends.map(trend => (
              <div key={trend.phase} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium text-lg">{trend.phase}フェーズ</div>
                  <div className="text-sm text-gray-500">
                    {trend.studentCount}名の学生
                  </div>
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

      {/* インサイト */}
      <Card>
        <CardHeader>
          <CardTitle>分析インサイト</CardTitle>
          <CardDescription>
            データから得られる示唆
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-[#E1F1F9] rounded-lg">
              <div className="font-medium text-gray-900">📊 フェーズによる視聴傾向の変化</div>
              <div className="text-gray-700 mt-1">
                認知フェーズでは基本的な企業情報、選考フェーズでは仕事内容や成長機会、内定フェーズでは条件面の動画が多く視聴されています。
              </div>
            </div>

            <div className="p-3 bg-[#E1F1F9] rounded-lg">
              <div className="font-medium text-gray-900">💡 コンテンツ最適化の機会</div>
              <div className="text-gray-700 mt-1">
                各フェーズで学生が求める情報が異なるため、フェーズに応じた動画の推薦や情報提供が効果的です。
              </div>
            </div>

            <div className="p-3 bg-[#E1F1F9] rounded-lg">
              <div className="font-medium text-gray-900">🎯 次のアクション</div>
              <div className="text-gray-700 mt-1">
                視聴率の低い動画のコンテンツを見直し、学生のニーズに合わせてアップデートすることで、エンゲージメントを向上できます。
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}