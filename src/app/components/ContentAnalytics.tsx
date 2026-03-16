import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { brochures, articles } from "../data/mockData";
import { supabase } from "../../lib/supabase";
import type { Video, Student, WatchEvent } from "../../lib/supabase";
import { Play, Eye, Clock, TrendingUp, BookOpen, Newspaper, Users, Home, Loader2, ChevronRight, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

type ContentTab = "all" | "videos" | "brochures" | "articles";

const COLORS = ["#5CA7D1", "#7DBDDD", "#17a2b8", "#20c997", "#6c757d"];

interface VideoDetailStat {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  viewCount: number;
  uniqueViewers: number;
  totalWatchTime: number;
  avgWatchTime: number;
  completionRate: number;
  duration: number;
}

interface VideoDetailData {
  stat: VideoDetailStat;
  viewers: { student: Student; watchSeconds: number; viewCount: number; lastWatched: string }[];
}

export function ContentAnalytics({ companyId }: { companyId: string }) {
  const [activeTab, setActiveTab] = useState<ContentTab>("all");
  const [loading, setLoading] = useState(true);
  const [videosList, setVideosList] = useState<Video[]>([]);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [watchEvents, setWatchEvents] = useState<WatchEvent[]>([]);
  const [selectedVideoDetail, setSelectedVideoDetail] = useState<VideoDetailData | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [vRes, sRes, wRes] = await Promise.all([
        supabase.from('videos').select('*').eq('company_id', companyId),
        supabase.from('students').select('*').eq('company_id', companyId),
        supabase.from('watch_events').select('*').eq('company_id', companyId)
      ]);
      setVideosList(vRes.data || []);
      setStudentsList(sRes.data || []);
      setWatchEvents(wRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, [companyId]);

  // 動画の統計データを計算
  const videoStats: VideoDetailStat[] = videosList.map((video) => {
    const videoEvents = watchEvents.filter(e => e.video_id === video.id);
    const viewCount = videoEvents.filter(e => e.event_type === 'play').length || 0;
    const uniqueViewers = new Set(videoEvents.map(e => e.student_id)).size;
    const totalWatchTime = videoEvents.reduce((max, e) => Math.max(max, e.position_sec || 0), 0);
    const avgWatchTime = uniqueViewers > 0 ? totalWatchTime / uniqueViewers : 0;
    const completionRate = video.duration_sec && video.duration_sec > 0
      ? (avgWatchTime / video.duration_sec) * 100
      : 0;
    return {
      id: video.id,
      title: video.title,
      category: video.category || "未分類",
      subcategory: video.subcategory || "なし",
      viewCount,
      uniqueViewers,
      totalWatchTime,
      avgWatchTime,
      completionRate,
      duration: video.duration_sec || 0,
    };
  }).sort((a, b) => b.viewCount - a.viewCount);

  // 動画詳細データを計算
  const openVideoDetail = (stat: VideoDetailStat) => {
    const videoEvents = watchEvents.filter(e => e.video_id === stat.id);
    const viewerMap = new Map<string, { watchSeconds: number; viewCount: number; lastWatched: string }>();

    videoEvents.forEach(e => {
      if (!viewerMap.has(e.student_id)) {
        viewerMap.set(e.student_id, { watchSeconds: 0, viewCount: 0, lastWatched: e.created_at });
      }
      const viewer = viewerMap.get(e.student_id)!;
      if (e.event_type === 'heartbeat') viewer.watchSeconds += 5;
      if (e.event_type === 'play') viewer.viewCount += 1;
      if (new Date(e.created_at) > new Date(viewer.lastWatched)) {
        viewer.lastWatched = e.created_at;
      }
    });

    const viewers = Array.from(viewerMap.entries())
      .map(([studentId, data]) => {
        const student = studentsList.find(s => s.id === studentId);
        if (!student) return null;
        return { student, ...data };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .sort((a, b) => new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime());

    setSelectedVideoDetail({ stat, viewers });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString("ja-JP", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });

  // パンフレットの統計データを計算 (現状はモックのまま)
  const brochureStats = brochures.map((brochure) => ({
    id: brochure.id,
    title: brochure.title,
    category: brochure.category,
    pages: brochure.pages,
    viewCount: 0,
    uniqueViewers: 0,
  })).sort((a, b) => b.viewCount - a.viewCount);

  // 記事の統計データを計算 (現状はモックのまま)
  const articleStats = articles.map((article) => ({
    id: article.id,
    title: article.title,
    category: article.category,
    readTime: article.readTime,
    readCount: 0,
    uniqueReaders: 0,
  })).sort((a, b) => b.readCount - a.readCount);

  // カテゴリ別の集計（動画）
  const videoCategoryData = videosList.reduce((acc, video) => {
    const stat = videoStats.find(s => s.id === video.id);
    const cat = video.category || "未分類";
    if (!acc[cat]) acc[cat] = { category: cat, viewCount: 0, viewers: 0 };
    acc[cat].viewCount += stat?.viewCount || 0;
    acc[cat].viewers += stat?.uniqueViewers || 0;
    return acc;
  }, {} as Record<string, { category: string; viewCount: number; viewers: number }>);
  const videoCategoryChartData = Object.values(videoCategoryData);

  const brochureCategoryData = brochures.reduce((acc, brochure) => {
    const stat = brochureStats.find(s => s.id === brochure.id);
    if (!acc[brochure.category]) acc[brochure.category] = { name: brochure.category, value: 0 };
    acc[brochure.category].value += stat?.viewCount || 0;
    return acc;
  }, {} as Record<string, { name: string; value: number }>);
  const brochureCategoryChartData = Object.values(brochureCategoryData);

  const articleCategoryData = articles.reduce((acc, article) => {
    const stat = articleStats.find(s => s.id === article.id);
    if (!acc[article.category]) acc[article.category] = { name: article.category, value: 0 };
    acc[article.category].value += stat?.readCount || 0;
    return acc;
  }, {} as Record<string, { name: string; value: number }>);
  const articleCategoryChartData = Object.values(articleCategoryData);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="h-10 w-10 text-[#5CA7D1] animate-spin" />
        <p className="text-gray-500">統計データを集計中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">コンテンツ別分析</h1>
        <p className="text-gray-600 mt-2">動画、パンフレット、記事の閲覧状況を分析します</p>
      </div>

      {/* タブナビゲーション */}
      <div className="flex gap-2 border-b">
        {[
          { key: "all", label: "すべて", icon: Home, count: null },
          { key: "videos", label: "動画", icon: Play, count: videosList.length },
          { key: "brochures", label: "パンフレット", icon: BookOpen, count: brochures.length },
          { key: "articles", label: "記事", icon: Newspaper, count: articles.length },
        ].map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as ContentTab)}
            className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === key
              ? "border-[#5CA7D1] text-[#5CA7D1]"
              : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <span>{label}</span>
              {count !== null && <Badge variant="secondary">{count}</Badge>}
            </div>
          </button>
        ))}
      </div>

      {/* すべてタブ */}
      {activeTab === "all" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">動画総視聴回数</CardTitle>
                <Play className="h-4 w-4 text-[#5CA7D1]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{videoStats.reduce((sum, s) => sum + s.viewCount, 0)}回</div>
                <p className="text-xs text-gray-500 mt-1">{videosList.length}本の動画</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">パンフレット総閲覧回数</CardTitle>
                <BookOpen className="h-4 w-4 text-[#5CA7D1]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{brochureStats.reduce((sum, s) => sum + s.viewCount, 0)}回</div>
                <p className="text-xs text-gray-500 mt-1">{brochures.length}冊のパンフレット</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">記事総閲覧回数</CardTitle>
                <Newspaper className="h-4 w-4 text-[#5CA7D1]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{articleStats.reduce((sum, s) => sum + s.readCount, 0)}回</div>
                <p className="text-xs text-gray-500 mt-1">{articles.length}件の記事</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>人気動画トップ5</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {videoStats.slice(0, 5).map((stat, index) => (
                  <div
                    key={stat.id}
                    className="flex items-start gap-4 p-4 border rounded-lg cursor-pointer hover:shadow-md hover:border-[#5CA7D1] transition-all"
                    onClick={() => openVideoDetail(stat)}
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-[#5CA7D1] text-white rounded-full flex items-center justify-center font-bold">{index + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{stat.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-[#5CA7D1] text-white text-xs">{stat.category}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="flex items-center gap-2 text-sm">
                              <Eye className="h-4 w-4 text-gray-400" />
                              <span className="font-semibold">{stat.viewCount}回</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{stat.uniqueViewers}人が視聴</div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>人気パンフレットトップ5</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {brochureStats.slice(0, 5).map((stat, index) => (
                  <div key={stat.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#5CA7D1] text-white rounded-full flex items-center justify-center font-bold">{index + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{stat.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-[#5CA7D1] text-white text-xs">{stat.category}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-sm">
                            <Eye className="h-4 w-4 text-gray-400" />
                            <span className="font-semibold">{stat.viewCount}回</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{stat.uniqueViewers}人が閲覧</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>人気記事トップ5</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {articleStats.slice(0, 5).map((stat, index) => (
                  <div key={stat.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#5CA7D1] text-white rounded-full flex items-center justify-center font-bold">{index + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{stat.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-[#5CA7D1] text-white text-xs">{stat.category}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-sm">
                            <Eye className="h-4 w-4 text-gray-400" />
                            <span className="font-semibold">{stat.readCount}回</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{stat.uniqueReaders}人が閲覧</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 動画タブ */}
      {activeTab === "videos" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総視聴回数</CardTitle>
                <Eye className="h-4 w-4 text-[#5CA7D1]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{videoStats.reduce((sum, s) => sum + s.viewCount, 0)}回</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総視聴時間</CardTitle>
                <Clock className="h-4 w-4 text-[#5CA7D1]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.floor(videoStats.reduce((sum, s) => sum + s.totalWatchTime, 0) / 60)}分
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均視聴完了率</CardTitle>
                <TrendingUp className="h-4 w-4 text-[#5CA7D1]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {videoStats.length > 0
                    ? Math.round(videoStats.reduce((sum, s) => sum + s.completionRate, 0) / videoStats.length)
                    : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>カテゴリ別視聴状況</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={videoCategoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="viewCount" fill="#5CA7D1" name="視聴回数" />
                  <Bar dataKey="viewers" fill="#7DBDDD" name="視聴者数" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>動画別詳細</CardTitle>
              <p className="text-sm text-gray-500 mt-1">各行をタップすると詳細を確認できます</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {videoStats.map((stat, index) => (
                  <div
                    key={stat.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:shadow-md hover:border-[#5CA7D1] transition-all cursor-pointer"
                    onClick={() => openVideoDetail(stat)}
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-[#5CA7D1] text-white rounded-full flex items-center justify-center font-bold">{index + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{stat.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-[#5CA7D1] text-white text-xs">{stat.category}</Badge>
                            <Badge variant="secondary" className="text-xs">{stat.subcategory}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Eye className="h-4 w-4 text-gray-400" />
                              <span className="font-semibold">{stat.viewCount}回</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Users className="h-4 w-4 text-gray-400" />
                              <span>{stat.uniqueViewers}人</span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                        <div>
                          <div className="text-gray-500">平均視聴時間</div>
                          <div className="font-semibold">{formatTime(stat.avgWatchTime)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">動画の長さ</div>
                          <div className="font-semibold">{formatTime(stat.duration)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">完了率</div>
                          <div className="font-semibold">{Math.round(stat.completionRate)}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* パンフレットタブ */}
      {activeTab === "brochures" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総閲覧回数</CardTitle>
                <Eye className="h-4 w-4 text-[#5CA7D1]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{brochureStats.reduce((sum, s) => sum + s.viewCount, 0)}回</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総閲覧者数</CardTitle>
                <Users className="h-4 w-4 text-[#5CA7D1]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {studentsList.filter(s => (s as any).viewedBrochures?.length > 0).length}人
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>カテゴリ別閲覧状況</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={brochureCategoryChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {brochureCategoryChartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>パンフレット別詳細</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {brochureStats.map((stat, index) => (
                  <div key={stat.id} className="flex items-start gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#5CA7D1] text-white rounded-full flex items-center justify-center font-bold">{index + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{stat.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-[#5CA7D1] text-white text-xs">{stat.category}</Badge>
                            <Badge variant="secondary" className="text-xs">{stat.pages}ページ</Badge>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Eye className="h-4 w-4 text-gray-400" />
                            <span className="font-semibold">{stat.viewCount}回</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>{stat.uniqueViewers}人</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 記事タブ */}
      {activeTab === "articles" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総閲覧回数</CardTitle>
                <Eye className="h-4 w-4 text-[#5CA7D1]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{articleStats.reduce((sum, s) => sum + s.readCount, 0)}回</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総閲覧者数</CardTitle>
                <Users className="h-4 w-4 text-[#5CA7D1]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {studentsList.filter(s => (s as any).viewedArticles?.length > 0).length}人
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle>カテゴリ別閲覧状況</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={articleCategoryChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {articleCategoryChartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>記事別詳細</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {articleStats.map((stat, index) => (
                  <div key={stat.id} className="flex items-start gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex-shrink-0 w-8 h-8 bg-[#5CA7D1] text-white rounded-full flex items-center justify-center font-bold">{index + 1}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{stat.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-[#5CA7D1] text-white text-xs">{stat.category}</Badge>
                            <Badge variant="secondary" className="text-xs">{stat.readTime}分</Badge>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Eye className="h-4 w-4 text-gray-400" />
                            <span className="font-semibold">{stat.readCount}回</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>{stat.uniqueReaders}人</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 動画詳細ダイアログ */}
      <Dialog open={selectedVideoDetail !== null} onOpenChange={(open) => !open && setSelectedVideoDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold pr-8">{selectedVideoDetail?.stat.title}</DialogTitle>
          </DialogHeader>
          {selectedVideoDetail && (
            <div className="space-y-5 mt-2">
              {/* バッジ */}
              <div className="flex items-center gap-2">
                <Badge className="bg-[#5CA7D1] text-white">{selectedVideoDetail.stat.category}</Badge>
                <Badge variant="secondary">{selectedVideoDetail.stat.subcategory}</Badge>
              </div>

              {/* サマリー */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-[#5CA7D1] mb-1">
                    <Eye className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{selectedVideoDetail.stat.viewCount}</div>
                  <div className="text-xs text-gray-500">視聴回数</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-[#5CA7D1] mb-1">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{selectedVideoDetail.stat.uniqueViewers}</div>
                  <div className="text-xs text-gray-500">視聴者数</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-[#5CA7D1] mb-1">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{formatTime(selectedVideoDetail.stat.totalWatchTime)}</div>
                  <div className="text-xs text-gray-500">総視聴時間</div>
                </div>
              </div>

              {/* 視聴した学生一覧 */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  視聴した学生 ({selectedVideoDetail.viewers.length}名)
                </h3>
                {selectedVideoDetail.viewers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 border rounded-lg bg-gray-50">
                    まだ視聴した学生はいません
                  </div>
                ) : (
                  <div className="divide-y rounded-lg border overflow-hidden">
                    {selectedVideoDetail.viewers.map(({ student, watchSeconds, viewCount, lastWatched }) => (
                      <div key={student.id} className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900">{student.name}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {student.university || "—"} {student.department || ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 shrink-0">
                          <div className="flex items-center gap-1">
                            <Play className="h-3.5 w-3.5 text-gray-400" />
                            <span>{viewCount}回</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                            <span>{formatTime(watchSeconds)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(lastWatched)}</span>
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
