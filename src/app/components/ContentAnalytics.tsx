import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { brochures, articles } from "../data/mockData";
import { supabase } from "../../lib/supabase";
import type { Video, Student, WatchEvent } from "../../lib/supabase";
import { Play, Eye, Clock, TrendingUp, FileText, BookOpen, Newspaper, Users, Home, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

type ContentTab = "all" | "videos" | "brochures" | "articles";

const COLORS = ["#5CA7D1", "#7DBDDD", "#17a2b8", "#20c997", "#6c757d"];

export function ContentAnalytics() {
  const [activeTab, setActiveTab] = useState<ContentTab>("all");
  const [loading, setLoading] = useState(true);
  const [videosList, setVideosList] = useState<Video[]>([]);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [watchEvents, setWatchEvents] = useState<WatchEvent[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [vRes, sRes, wRes] = await Promise.all([
        supabase.from('videos').select('*'),
        supabase.from('students').select('*'),
        supabase.from('watch_events').select('*')
      ]);
      setVideosList(vRes.data || []);
      setStudentsList(sRes.data || []);
      setWatchEvents(wRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  // 動画の統計データを計算
  const videoStats = videosList.map((video) => {
    const videoEvents = watchEvents.filter(e => e.video_id === video.id);

    // 視聴回数（playイベントの数、またはセッション数などで定義）
    // ここでは単純にplayイベントの数をカウント（各セッション1回とするのが理想だが簡易化）
    const viewCount = videoEvents.filter(e => e.event_type === 'play').length || 0;

    // ユニーク視聴者数
    const uniqueViewers = new Set(videoEvents.map(e => e.student_id)).size;

    // 総視聴時間（heartbeatなどのイベントから推測するか、position_secの最大値などで簡易計算）
    // ここでは watch_events の heartbeat の数を秒数と仮定（または position_sec の最大値）
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

  // パンフレットの統計データを計算 (現状はモックのまま)
  const brochureStats = brochures.map((brochure) => {
    return {
      id: brochure.id,
      title: brochure.title,
      category: brochure.category,
      pages: brochure.pages,
      viewCount: 0,
      uniqueViewers: 0,
    };
  }).sort((a, b) => b.viewCount - a.viewCount);

  // 記事の統計データを計算 (現状はモックのまま)
  const articleStats = articles.map((article) => {
    return {
      id: article.id,
      title: article.title,
      category: article.category,
      readTime: article.readTime,
      readCount: 0,
      uniqueReaders: 0,
    };
  }).sort((a, b) => b.readCount - a.readCount);

  // カテゴリ別の集計（動画）
  const videoCategoryData = videosList.reduce((acc, video) => {
    const stat = videoStats.find(s => s.id === video.id);
    const cat = video.category || "未分類";
    if (!acc[cat]) {
      acc[cat] = { category: cat, viewCount: 0, viewers: 0 };
    }
    acc[cat].viewCount += stat?.viewCount || 0;
    acc[cat].viewers += stat?.uniqueViewers || 0;
    return acc;
  }, {} as Record<string, { category: string; viewCount: number; viewers: number }>);

  const videoCategoryChartData = Object.values(videoCategoryData);

  // カテゴリ別の集計（パンフレット）
  const brochureCategoryData = brochures.reduce((acc, brochure) => {
    const stat = brochureStats.find(s => s.id === brochure.id);
    if (!acc[brochure.category]) {
      acc[brochure.category] = { name: brochure.category, value: 0 };
    }
    acc[brochure.category].value += stat?.viewCount || 0;
    return acc;
  }, {} as Record<string, { name: string; value: number }>);

  const brochureCategoryChartData = Object.values(brochureCategoryData);

  // カテゴリ別の集計（記事）
  const articleCategoryData = articles.reduce((acc, article) => {
    const stat = articleStats.find(s => s.id === article.id);
    if (!acc[article.category]) {
      acc[article.category] = { name: article.category, value: 0 };
    }
    acc[article.category].value += stat?.readCount || 0;
    return acc;
  }, {} as Record<string, { name: string; value: number }>);

  const articleCategoryChartData = Object.values(articleCategoryData);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

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
        <p className="text-gray-600 mt-2">
          動画、パンフレット、記事の閲覧状況を分析します
        </p>
      </div>

      {/* タブナビゲーション */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === "all"
            ? "border-[#5CA7D1] text-[#5CA7D1]"
            : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
        >
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            <span>すべて</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab("videos")}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === "videos"
            ? "border-[#5CA7D1] text-[#5CA7D1]"
            : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
        >
          <div className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            <span>動画</span>
            <Badge variant="secondary">{videosList.length}</Badge>
          </div>
        </button>
        <button
          onClick={() => setActiveTab("brochures")}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === "brochures"
            ? "border-[#5CA7D1] text-[#5CA7D1]"
            : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <span>パンフレット</span>
            <Badge variant="secondary">{brochures.length}</Badge>
          </div>
        </button>
        <button
          onClick={() => setActiveTab("articles")}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === "articles"
            ? "border-[#5CA7D1] text-[#5CA7D1]"
            : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
        >
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            <span>記事</span>
            <Badge variant="secondary">{articles.length}</Badge>
          </div>
        </button>
      </div>

      {/* すべてタブ */}
      {activeTab === "all" && (
        <div className="space-y-6">
          {/* 全体サマリーカード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">動画総視聴回数</CardTitle>
                <Play className="h-4 w-4 text-[#5CA7D1]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {videoStats.reduce((sum, s) => sum + s.viewCount, 0)}回
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {videosList.length}本の動画
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">パンフレット総閲覧回数</CardTitle>
                <BookOpen className="h-4 w-4 text-[#5CA7D1]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {brochureStats.reduce((sum, s) => sum + s.viewCount, 0)}回
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {brochures.length}冊のパンフレット
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">記事総閲覧回数</CardTitle>
                <Newspaper className="h-4 w-4 text-[#5CA7D1]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {articleStats.reduce((sum, s) => sum + s.readCount, 0)}回
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {articles.length}件の記事
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 動画トップ5 */}
          <Card>
            <CardHeader>
              <CardTitle>人気動画トップ5</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {videoStats.slice(0, 5).map((stat, index) => (
                  <div
                    key={stat.id}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-[#5CA7D1] text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{stat.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-[#5CA7D1] text-white text-xs">
                              {stat.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-sm">
                            <Eye className="h-4 w-4 text-gray-400" />
                            <span className="font-semibold">{stat.viewCount}回</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {stat.uniqueViewers}人が視聴
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* パンフレットトップ5 */}
          <Card>
            <CardHeader>
              <CardTitle>人気パンフレットトップ5</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {brochureStats.slice(0, 5).map((stat, index) => (
                  <div
                    key={stat.id}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-[#5CA7D1] text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{stat.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-[#5CA7D1] text-white text-xs">
                              {stat.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-sm">
                            <Eye className="h-4 w-4 text-gray-400" />
                            <span className="font-semibold">{stat.viewCount}回</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {stat.uniqueViewers}人が閲覧
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 記事トップ5 */}
          <Card>
            <CardHeader>
              <CardTitle>人気記事トップ5</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {articleStats.slice(0, 5).map((stat, index) => (
                  <div
                    key={stat.id}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-[#5CA7D1] text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{stat.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-[#5CA7D1] text-white text-xs">
                              {stat.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-sm">
                            <Eye className="h-4 w-4 text-gray-400" />
                            <span className="font-semibold">{stat.readCount}回</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {stat.uniqueReaders}人が閲覧
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

      {/* 動画タブ */}
      {activeTab === "videos" && (
        <div className="space-y-6">
          {/* サマリーカード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総視聴回数</CardTitle>
                <Eye className="h-4 w-4 text-[#5CA7D1]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {videoStats.reduce((sum, s) => sum + s.viewCount, 0)}回
                </div>
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

          {/* カテゴリ別グラフ */}
          <Card>
            <CardHeader>
              <CardTitle>カテゴリ別視聴状況</CardTitle>
            </CardHeader>
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

          {/* 動画一覧 */}
          <Card>
            <CardHeader>
              <CardTitle>動画別詳細</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {videoStats.map((stat, index) => (
                  <div
                    key={stat.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-[#5CA7D1] text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{stat.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-[#5CA7D1] text-white text-xs">
                              {stat.category}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {stat.subcategory}
                            </Badge>
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
          {/* サマリーカード */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総閲覧回数</CardTitle>
                <Eye className="h-4 w-4 text-[#5CA7D1]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {brochureStats.reduce((sum, s) => sum + s.viewCount, 0)}回
                </div>
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

          {/* カテゴリ別グラフ */}
          <Card>
            <CardHeader>
              <CardTitle>カテゴリ別閲覧状況</CardTitle>
            </CardHeader>
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
                    {brochureCategoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* パンフレット一覧 */}
          <Card>
            <CardHeader>
              <CardTitle>パンフレット別詳細</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {brochureStats.map((stat, index) => (
                  <div
                    key={stat.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-[#5CA7D1] text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{stat.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-[#5CA7D1] text-white text-xs">
                              {stat.category}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {stat.pages}ページ
                            </Badge>
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
          {/* サマリーカード */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総閲覧回数</CardTitle>
                <Eye className="h-4 w-4 text-[#5CA7D1]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {articleStats.reduce((sum, s) => sum + s.readCount, 0)}回
                </div>
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

          {/* カテゴリ別グラフ */}
          <Card>
            <CardHeader>
              <CardTitle>カテゴリ別閲覧状況</CardTitle>
            </CardHeader>
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
                    {articleCategoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 記事一覧 */}
          <Card>
            <CardHeader>
              <CardTitle>記事別詳細</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {articleStats.map((stat, index) => (
                  <div
                    key={stat.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-[#5CA7D1] text-white rounded-full flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{stat.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-[#5CA7D1] text-white text-xs">
                              {stat.category}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {stat.readTime}分
                            </Badge>
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
    </div>
  );
}