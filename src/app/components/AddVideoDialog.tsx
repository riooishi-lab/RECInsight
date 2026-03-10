import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Youtube, HardDrive, Upload, Loader2 } from "lucide-react";
import { supabase, type Video } from "../../lib/supabase";
import { getStepSettings } from "../hooks/useStepSettings";
import { toast } from "sonner";

interface AddVideoDialogProps {
  children: React.ReactNode;
  onSuccess?: () => void;
  video?: Video; // 編集モード用の動画データ
}

const categories = [
  { value: "目標の魅力", subcategories: ["会社基盤", "理念戦略"] },
  { value: "人材の魅力", subcategories: ["組織風土", "人的魅力"] },
  { value: "活動の魅力", subcategories: ["事業内容", "仕事内容"] },
  { value: "条件の魅力", subcategories: ["報酬体系", "仕事環境"] },
];

export function AddVideoDialog({ children, onSuccess, video }: AddVideoDialogProps) {
  const [open, setOpen] = useState(false);
  const [videoTitle, setVideoTitle] = useState(video?.title || "");
  const [category, setCategory] = useState(video?.category || "");
  const [subcategory, setSubcategory] = useState(video?.subcategory || "");
  const [youtubeUrl, setYoutubeUrl] = useState(video?.video_url?.startsWith('https://www.youtube.com') || video?.video_url?.startsWith('https://youtu.be') ? video.video_url : "");
  const [driveUrl, setDriveUrl] = useState(video?.video_url?.startsWith('https://drive.google.com') ? video.video_url : "");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedCategory = categories.find(c => c.value === category);

  const handleSubmit = async (method: "youtube" | "drive" | "upload") => {
    setLoading(true);
    let videoUrl = "";

    if (method === "youtube") videoUrl = youtubeUrl;
    else if (method === "drive") videoUrl = driveUrl;
    else if (method === "upload" && uploadFile) {
      // 本来は Supabase Storage にアップロードするが、今回は簡易的にファイル名を保持（またはURL取得処理）
      // ※現状はURLなしで登録、またはStorage実装が必要。一旦URLパスとして扱う。
      videoUrl = `upload://${uploadFile.name}`;
      toast.info("ファイルアップロードはURLの保持のみ行います（Storage機能は別途実装が必要です）");
    }

    if (video) {
      // 編集モード
      const { error } = await supabase
        .from('videos')
        .update({
          title: videoTitle,
          category,
          subcategory,
          video_url: videoUrl,
        })
        .eq('id', video.id);

      if (error) {
        toast.error(`更新エラー: ${error.message}`);
      } else {
        toast.success("動画を更新しました");
        onSuccess?.();
        setOpen(false);
      }
    } else {
      // 新規追加モード
      const { error } = await supabase
        .from('videos')
        .insert([
          {
            title: videoTitle,
            category,
            subcategory,
            video_url: videoUrl,
            duration_sec: 300, // デフォルト5分
            available_phases: getStepSettings().steps.map((s) => s.id) // 全ステップ公開
          }
        ]);

      if (error) {
        toast.error(`追加エラー: ${error.message}`);
      } else {
        toast.success("動画を追加しました");
        onSuccess?.();
        setOpen(false);
        // フォームをリセット
        setVideoTitle("");
        setCategory("");
        setSubcategory("");
        setYoutubeUrl("");
        setDriveUrl("");
        setUploadFile(null);
      }
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{video ? "動画を編集" : "新しい動画を追加"}</DialogTitle>
          <DialogDescription>
            {video ? "動画の詳細情報を更新します" : "YouTubeリンク、Googleドライブリンク、またはファイルアップロードで動画を追加できます"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* 基本情報 */}
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-medium">基本情報</h3>

            <div className="space-y-2">
              <Label htmlFor="title">動画タイトル *</Label>
              <Input
                id="title"
                placeholder="例: 企業認知"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">カテゴリ *</Label>
                <Select value={category} onValueChange={(value) => {
                  setCategory(value);
                  setSubcategory(""); // カテゴリ変更時にサブカテゴリをリセット
                }}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subcategory">サブカテゴリ *</Label>
                <Select
                  value={subcategory}
                  onValueChange={setSubcategory}
                  disabled={!category}
                >
                  <SelectTrigger id="subcategory">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCategory?.subcategories.map(sub => (
                      <SelectItem key={sub} value={sub}>
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 動画ソース */}
          <Tabs defaultValue={video?.video_url?.startsWith('https://drive.google.com') ? "drive" : video?.video_url?.startsWith('upload://') ? "upload" : "youtube"} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="youtube" className="gap-2">
                <Youtube className="h-4 w-4" />
                YouTube
              </TabsTrigger>
              <TabsTrigger value="drive" className="gap-2">
                <HardDrive className="h-4 w-4" />
                Google Drive
              </TabsTrigger>
              <TabsTrigger value="upload" className="gap-2">
                <Upload className="h-4 w-4" />
                アップロード
              </TabsTrigger>
            </TabsList>

            <TabsContent value="youtube" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="youtube-url">YouTubeリンク *</Label>
                <Input
                  id="youtube-url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  YouTube動画のURLを入力してください
                </p>
              </div>

              <Button
                onClick={() => handleSubmit("youtube")}
                disabled={!videoTitle || !category || !subcategory || !youtubeUrl || loading}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {video ? "変更を保存" : "YouTubeリンクで追加"}
              </Button>
            </TabsContent>

            <TabsContent value="drive" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="drive-url">Googleドライブリンク *</Label>
                <Input
                  id="drive-url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  Googleドライブの動画リンクを入力してください（共有設定を「リンクを知っている全員」に変更してください）
                </p>
              </div>

              <Button
                onClick={() => handleSubmit("drive")}
                disabled={!videoTitle || !category || !subcategory || !driveUrl || loading}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {video ? "変更を保存" : "Googleドライブリンクで追加"}
              </Button>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">動画ファイル *</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
                <p className="text-sm text-gray-500">
                  MP4, MOV, AVIなどの動画ファイルをアップロードできます（最大500MB）
                </p>
                {uploadFile && (
                  <div className="text-sm text-green-600 flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>

              <Button
                onClick={() => handleSubmit("upload")}
                disabled={!videoTitle || !category || !subcategory || (!uploadFile && !video?.video_url?.startsWith('upload://')) || loading}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {video ? "変更を保存" : "ファイルをアップロードして追加"}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
