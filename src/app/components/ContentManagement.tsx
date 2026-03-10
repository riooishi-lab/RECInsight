import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { AddVideoDialog, BRIEFING_CATEGORY } from "./AddVideoDialog";
import { AddBrochureDialog } from "./AddBrochureDialog";
import { AddArticleDialog } from "./AddArticleDialog";
import { supabase } from "../../lib/supabase";
import type { Video, Brochure, Article } from "../../lib/supabase";
import { useStepSettings } from "../hooks/useStepSettings";
import {
  Pencil,
  Trash2,
  Plus,
  Video as VideoIcon,
  BookOpen,
  FileText,
  Settings2,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Checkbox } from "./ui/checkbox";

// ─── ステップ設定ダイアログ（動画・パンフレット・記事共通） ───
interface StepDialogState {
  type: "video" | "brochure" | "article";
  id: string;
  title: string;
  currentPhases: string[];
}

export function ContentManagement() {
  const { settings, stepIds } = useStepSettings();

  // ─── Videos ───
  const [videosList, setVideosList] = useState<Video[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);

  // ─── Brochures ───
  const [brochuresList, setBrochuresList] = useState<Brochure[]>([]);
  const [brochuresLoading, setBrochuresLoading] = useState(true);

  // ─── Articles ───
  const [articlesList, setArticlesList] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);

  // ─── ステップ設定ダイアログ（共通） ───
  const [stepDialog, setStepDialog] = useState<StepDialogState | null>(null);
  const [selectedSteps, setSelectedSteps] = useState<string[]>([]);

  // ─── Fetch ───
  const fetchVideos = useCallback(async () => {
    setVideosLoading(true);
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(`動画取得エラー: ${error.message}`);
    else setVideosList(data || []);
    setVideosLoading(false);
  }, []);

  const fetchBrochures = useCallback(async () => {
    setBrochuresLoading(true);
    const { data, error } = await supabase
      .from("brochures")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(`パンフレット取得エラー: ${error.message}`);
    else setBrochuresList(data || []);
    setBrochuresLoading(false);
  }, []);

  const fetchArticles = useCallback(async () => {
    setArticlesLoading(true);
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(`記事取得エラー: ${error.message}`);
    else setArticlesList(data || []);
    setArticlesLoading(false);
  }, []);

  useEffect(() => {
    fetchVideos();
    fetchBrochures();
    fetchArticles();

    const videoChannel = supabase
      .channel("video-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "videos" }, fetchVideos)
      .subscribe();

    const brochureChannel = supabase
      .channel("brochure-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "brochures" }, fetchBrochures)
      .subscribe();

    const articleChannel = supabase
      .channel("article-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "articles" }, fetchArticles)
      .subscribe();

    return () => {
      supabase.removeChannel(videoChannel);
      supabase.removeChannel(brochureChannel);
      supabase.removeChannel(articleChannel);
    };
  }, [fetchVideos, fetchBrochures, fetchArticles]);

  // ─── 公開ステータス切り替え ───
  const togglePublish = async (
    table: "videos" | "brochures" | "articles",
    id: string,
    current: boolean,
    refetch: () => void
  ) => {
    const { error } = await supabase
      .from(table)
      .update({ is_published: !current })
      .eq("id", id);
    if (error) toast.error(`更新エラー: ${error.message}`);
    else {
      toast.success(!current ? "公開しました" : "下書きに戻しました");
      refetch();
    }
  };

  // ─── 削除 ───
  const handleDelete = async (
    table: "videos" | "brochures" | "articles",
    id: string,
    label: string,
    refetch: () => void
  ) => {
    if (!confirm(`「${label}」を削除しますか？`)) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) toast.error(`削除エラー: ${error.message}`);
    else {
      toast.success("削除しました");
      refetch();
    }
  };

  // ─── ステップ設定ダイアログ ───
  const openStepDialog = (
    type: StepDialogState["type"],
    id: string,
    title: string,
    currentPhases: string[]
  ) => {
    setStepDialog({ type, id, title, currentPhases });
    setSelectedSteps(currentPhases.filter((s) => stepIds.includes(s)));
  };

  const handleStepToggle = (stepId: string) => {
    setSelectedSteps((prev) => {
      const idx = stepIds.indexOf(stepId);
      if (idx === -1) return prev;
      if (prev.includes(stepId)) {
        return stepIds.slice(idx + 1).filter((s) => prev.includes(s));
      } else {
        return stepIds.slice(idx);
      }
    });
  };

  const handleStepSave = async () => {
    if (!stepDialog) return;
    const table =
      stepDialog.type === "video"
        ? "videos"
        : stepDialog.type === "brochure"
        ? "brochures"
        : "articles";
    const { error } = await supabase
      .from(table)
      .update({ available_phases: selectedSteps })
      .eq("id", stepDialog.id);
    if (error) {
      toast.error(`更新エラー: ${error.message}`);
    } else {
      toast.success("公開ステップを更新しました");
      setStepDialog(null);
      if (stepDialog.type === "video") fetchVideos();
      else if (stepDialog.type === "brochure") fetchBrochures();
      else fetchArticles();
    }
  };

  // ─── ヘルパー ───
  const getStepLabel = (stepId: string) => {
    const step = settings.steps.find((s) => s.id === stepId);
    return step ? `${step.id}（${step.subtitle}）` : stepId;
  };

  const getStepLabels = (phases: string[] | null) =>
    (phases || []).filter((s) => stepIds.includes(s)).sort();

  const publishBadge = (isPublished: boolean) =>
    isPublished ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer select-none">
        <Eye className="h-3 w-3 mr-1" />
        公開中
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer select-none">
        <EyeOff className="h-3 w-3 mr-1" />
        下書き
      </Badge>
    );

  // ─── 共通テーブル行アクション ───
  const renderStepCell = (phases: string[] | null) =>
    settings.enabled ? (
      <div className="flex flex-wrap gap-1">
        {getStepLabels(phases).map((stepId) => (
          <Badge
            key={stepId}
            variant="secondary"
            className="text-xs bg-[#E1F1F9] text-[#0079B3]"
          >
            {getStepLabel(stepId)}
          </Badge>
        ))}
        {getStepLabels(phases).length === 0 && (
          <span className="text-xs text-gray-400">未設定</span>
        )}
      </div>
    ) : (
      <Badge variant="secondary" className="bg-green-100 text-green-800">
        全公開
      </Badge>
    );

  // ─── 統計カード ───
  const totalPublished = (list: { is_published: boolean }[]) =>
    list.filter((i) => i.is_published).length;
  const totalDraft = (list: { is_published: boolean }[]) =>
    list.filter((i) => !i.is_published).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">コンテンツ管理</h2>
        <p className="text-gray-500 mt-1">動画・パンフレット・記事の管理・編集</p>
      </div>

      {/* ─── 統計カード ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">総コンテンツ数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {videosList.length + brochuresList.length + articlesList.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">公開中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalPublished(videosList) +
                totalPublished(brochuresList) +
                totalPublished(articlesList)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">下書き</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">
              {totalDraft(videosList) +
                totalDraft(brochuresList) +
                totalDraft(articlesList)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">コンテンツ種別</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3種</div>
          </CardContent>
        </Card>
      </div>

      {/* ─── コンテンツタブ ─── */}
      <Tabs defaultValue="videos">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="videos" className="gap-2">
            <VideoIcon className="h-4 w-4" />
            動画 ({videosList.length})
          </TabsTrigger>
          <TabsTrigger value="brochures" className="gap-2">
            <BookOpen className="h-4 w-4" />
            パンフレット ({brochuresList.length})
          </TabsTrigger>
          <TabsTrigger value="articles" className="gap-2">
            <FileText className="h-4 w-4" />
            記事 ({articlesList.length})
          </TabsTrigger>
        </TabsList>

        {/* ─── 動画タブ ─── */}
        <TabsContent value="videos" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <AddVideoDialog onSuccess={fetchVideos}>
              <Button className="gap-2 bg-[#0079B3] hover:bg-[#0079B3]/90">
                <Plus className="h-4 w-4" />
                新しい動画を追加
              </Button>
            </AddVideoDialog>
          </div>

          {videosLoading ? (
            <div className="py-12 text-center text-gray-400 animate-pulse">読み込み中...</div>
          ) : (
            <>
            {/* ─── 会社説明会セクション ─── */}
            {(() => {
              const briefingVideos = videosList.filter((v) => v.category === BRIEFING_CATEGORY);
              return (
                <Card className="border-blue-200 bg-blue-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base text-blue-700">
                      <VideoIcon className="h-4 w-4" />
                      {BRIEFING_CATEGORY}
                      <span className="text-xs font-normal text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full ml-1">学生ポータル最上部に表示</span>
                    </CardTitle>
                    <CardDescription>{briefingVideos.length}本の動画</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">サムネイル</TableHead>
                          <TableHead>タイトル</TableHead>
                          {settings.enabled && <TableHead>公開ステップ</TableHead>}
                          <TableHead>ステータス</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {briefingVideos.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={settings.enabled ? 5 : 4} className="text-center py-4 text-gray-400">
                              会社説明会動画はありません
                            </TableCell>
                          </TableRow>
                        ) : (
                          briefingVideos.map((video) => {
                            const youtubeId = video.video_url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\s]{11})/)?.[1];
                            const thumbnailSrc = video.thumbnail_url || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : null);
                            return (
                              <TableRow key={video.id}>
                                <TableCell>
                                  {thumbnailSrc ? (
                                    <img src={thumbnailSrc} alt={video.title} className="w-14 h-9 object-cover rounded border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                  ) : (
                                    <div className="w-14 h-9 rounded border bg-gray-100 flex items-center justify-center">
                                      <ImageIcon className="h-4 w-4 text-gray-400" />
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">{video.title}</TableCell>
                                {settings.enabled && <TableCell>{renderStepCell(video.available_phases as string[])}</TableCell>}
                                <TableCell>
                                  <button onClick={() => togglePublish("videos", video.id, video.is_published ?? true, fetchVideos)}>
                                    {publishBadge(video.is_published ?? true)}
                                  </button>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <AddVideoDialog video={video} onSuccess={fetchVideos}>
                                      <Button variant="ghost" size="sm" className="gap-1"><Pencil className="h-3 w-3" />編集</Button>
                                    </AddVideoDialog>
                                    {settings.enabled && (
                                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => openStepDialog("video", video.id, video.title, (video.available_phases as string[]) || [])}>
                                        <Settings2 className="h-3 w-3" />ステップ
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="sm" className="gap-1 text-red-600 hover:text-red-700" onClick={() => handleDelete("videos", video.id, video.title, fetchVideos)}>
                                      <Trash2 className="h-3 w-3" />削除
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })()}

            {/* ─── 4つの魅力カテゴリ ─── */}
            {["目標の魅力", "人材の魅力", "活動の魅力", "条件の魅力"].map((category) => {
              const catVideos = videosList.filter((v) => v.category === category);
              return (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <VideoIcon className="h-4 w-4" />
                      {category}
                    </CardTitle>
                    <CardDescription>{catVideos.length}本の動画</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">サムネイル</TableHead>
                          <TableHead>タイトル</TableHead>
                          <TableHead>サブカテゴリ</TableHead>
                          {settings.enabled && <TableHead>公開ステップ</TableHead>}
                          <TableHead>ステータス</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {catVideos.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={settings.enabled ? 6 : 5} className="text-center py-4 text-gray-400">
                              このカテゴリに動画はありません
                            </TableCell>
                          </TableRow>
                        ) : (
                          catVideos.map((video) => {
                            const youtubeId = video.video_url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\s]{11})/)?.[1];
                            const thumbnailSrc = video.thumbnail_url || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : null);
                            return (
                            <TableRow key={video.id}>
                              <TableCell>
                                {thumbnailSrc ? (
                                  <img
                                    src={thumbnailSrc}
                                    alt={video.title}
                                    className="w-14 h-9 object-cover rounded border"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                  />
                                ) : (
                                  <div className="w-14 h-9 rounded border bg-gray-100 flex items-center justify-center">
                                    <ImageIcon className="h-4 w-4 text-gray-400" />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{video.title}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{video.subcategory}</Badge>
                              </TableCell>
                              {settings.enabled && (
                                <TableCell>{renderStepCell(video.available_phases as string[])}</TableCell>
                              )}
                              <TableCell>
                                <button
                                  onClick={() =>
                                    togglePublish("videos", video.id, video.is_published ?? true, fetchVideos)
                                  }
                                >
                                  {publishBadge(video.is_published ?? true)}
                                </button>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <AddVideoDialog video={video} onSuccess={fetchVideos}>
                                    <Button variant="ghost" size="sm" className="gap-1">
                                      <Pencil className="h-3 w-3" />
                                      編集
                                    </Button>
                                  </AddVideoDialog>
                                  {settings.enabled && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="gap-1"
                                      onClick={() =>
                                        openStepDialog(
                                          "video",
                                          video.id,
                                          video.title,
                                          (video.available_phases as string[]) || []
                                        )
                                      }
                                    >
                                      <Settings2 className="h-3 w-3" />
                                      ステップ
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1 text-red-600 hover:text-red-700"
                                    onClick={() =>
                                      handleDelete("videos", video.id, video.title, fetchVideos)
                                    }
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    削除
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )})
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
            </>
          )}
        </TabsContent>

        {/* ─── パンフレットタブ ─── */}
        <TabsContent value="brochures" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <AddBrochureDialog onSuccess={fetchBrochures}>
              <Button className="gap-2 bg-[#0079B3] hover:bg-[#0079B3]/90">
                <Plus className="h-4 w-4" />
                新しいパンフレットを追加
              </Button>
            </AddBrochureDialog>
          </div>

          {brochuresLoading ? (
            <div className="py-12 text-center text-gray-400 animate-pulse">読み込み中...</div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4" />
                  パンフレット一覧
                </CardTitle>
                <CardDescription>{brochuresList.length}件のパンフレット</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>タイトル</TableHead>
                      <TableHead>カテゴリ</TableHead>
                      {settings.enabled && <TableHead>公開ステップ</TableHead>}
                      <TableHead>ステータス</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brochuresList.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={settings.enabled ? 5 : 4}
                          className="text-center py-8 text-gray-400"
                        >
                          パンフレットがありません。追加してください。
                        </TableCell>
                      </TableRow>
                    ) : (
                      brochuresList.map((brochure) => (
                        <TableRow key={brochure.id}>
                          <TableCell className="font-medium">{brochure.title}</TableCell>
                          <TableCell>
                            {brochure.category ? (
                              <Badge variant="outline">{brochure.category}</Badge>
                            ) : (
                              <span className="text-gray-400 text-xs">未設定</span>
                            )}
                          </TableCell>
                          {settings.enabled && (
                            <TableCell>
                              {renderStepCell(brochure.available_phases)}
                            </TableCell>
                          )}
                          <TableCell>
                            <button
                              onClick={() =>
                                togglePublish("brochures", brochure.id, brochure.is_published, fetchBrochures)
                              }
                            >
                              {publishBadge(brochure.is_published)}
                            </button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <AddBrochureDialog brochure={brochure} onSuccess={fetchBrochures}>
                                <Button variant="ghost" size="sm" className="gap-1">
                                  <Pencil className="h-3 w-3" />
                                  編集
                                </Button>
                              </AddBrochureDialog>
                              {settings.enabled && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() =>
                                    openStepDialog(
                                      "brochure",
                                      brochure.id,
                                      brochure.title,
                                      brochure.available_phases || []
                                    )
                                  }
                                >
                                  <Settings2 className="h-3 w-3" />
                                  ステップ
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-red-600 hover:text-red-700"
                                onClick={() =>
                                  handleDelete("brochures", brochure.id, brochure.title, fetchBrochures)
                                }
                              >
                                <Trash2 className="h-3 w-3" />
                                削除
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── 記事タブ ─── */}
        <TabsContent value="articles" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <AddArticleDialog onSuccess={fetchArticles}>
              <Button className="gap-2 bg-[#0079B3] hover:bg-[#0079B3]/90">
                <Plus className="h-4 w-4" />
                新しい記事を追加
              </Button>
            </AddArticleDialog>
          </div>

          {articlesLoading ? (
            <div className="py-12 text-center text-gray-400 animate-pulse">読み込み中...</div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  記事一覧
                </CardTitle>
                <CardDescription>{articlesList.length}件の記事</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>タイトル</TableHead>
                      <TableHead>カテゴリ</TableHead>
                      {settings.enabled && <TableHead>公開ステップ</TableHead>}
                      <TableHead>ステータス</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articlesList.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={settings.enabled ? 5 : 4}
                          className="text-center py-8 text-gray-400"
                        >
                          記事がありません。追加してください。
                        </TableCell>
                      </TableRow>
                    ) : (
                      articlesList.map((article) => (
                        <TableRow key={article.id}>
                          <TableCell className="font-medium">{article.title}</TableCell>
                          <TableCell>
                            {article.category ? (
                              <Badge variant="outline">{article.category}</Badge>
                            ) : (
                              <span className="text-gray-400 text-xs">未設定</span>
                            )}
                          </TableCell>
                          {settings.enabled && (
                            <TableCell>
                              {renderStepCell(article.available_phases)}
                            </TableCell>
                          )}
                          <TableCell>
                            <button
                              onClick={() =>
                                togglePublish("articles", article.id, article.is_published, fetchArticles)
                              }
                            >
                              {publishBadge(article.is_published)}
                            </button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <AddArticleDialog article={article} onSuccess={fetchArticles}>
                                <Button variant="ghost" size="sm" className="gap-1">
                                  <Pencil className="h-3 w-3" />
                                  編集
                                </Button>
                              </AddArticleDialog>
                              {settings.enabled && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() =>
                                    openStepDialog(
                                      "article",
                                      article.id,
                                      article.title,
                                      article.available_phases || []
                                    )
                                  }
                                >
                                  <Settings2 className="h-3 w-3" />
                                  ステップ
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-red-600 hover:text-red-700"
                                onClick={() =>
                                  handleDelete("articles", article.id, article.title, fetchArticles)
                                }
                              >
                                <Trash2 className="h-3 w-3" />
                                削除
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── ステップ設定ダイアログ（共通） ─── */}
      <Dialog open={stepDialog !== null} onOpenChange={(open) => !open && setStepDialog(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>公開ステップ設定</DialogTitle>
            <DialogDescription>
              「{stepDialog?.title}」を公開するステップを選択してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              {settings.steps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <Checkbox
                    id={`step-${step.id}`}
                    checked={selectedSteps.includes(step.id)}
                    onCheckedChange={() => handleStepToggle(step.id)}
                  />
                  <label
                    htmlFor={`step-${step.id}`}
                    className="flex-1 cursor-pointer leading-none"
                  >
                    <span className="text-sm font-medium" style={{ color: step.color }}>
                      {step.id}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">（{step.subtitle}）</span>
                  </label>
                  <div className="flex gap-1">
                    {step.phases.map((phase) => (
                      <Badge
                        key={phase}
                        className="text-white text-xs"
                        style={{ backgroundColor: step.color }}
                      >
                        {phase}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-[#E1F1F9] p-3 rounded-lg">
              <p className="text-xs text-[#0079B3]">
                <strong>選択中:</strong>{" "}
                {selectedSteps.length === 0 ? "なし" : selectedSteps.join("、")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStepDialog(null)}>
              キャンセル
            </Button>
            <Button className="bg-[#0079B3] hover:bg-[#0079B3]/90" onClick={handleStepSave}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
