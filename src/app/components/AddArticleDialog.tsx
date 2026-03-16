import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase, type Article } from "../../lib/supabase";
import { getStepSettings } from "../hooks/useStepSettings";
import { toast } from "sonner";

interface AddArticleDialogProps {
  children: React.ReactNode;
  onSuccess?: () => void;
  article?: Article;
  companyId?: string;
}

export function AddArticleDialog({ children, onSuccess, article, companyId }: AddArticleDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(article?.title || "");
  const [description, setDescription] = useState(article?.description || "");
  const [contentUrl, setContentUrl] = useState(article?.content_url || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(article?.thumbnail_url || "");
  const [category, setCategory] = useState(article?.category || "");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setContentUrl("");
    setThumbnailUrl("");
    setCategory("");
  };

  const handleSubmit = async () => {
    if (!title || !contentUrl) {
      toast.error("タイトルとURLは必須です");
      return;
    }
    setLoading(true);

    const payload = {
      title,
      description: description || null,
      content_url: contentUrl,
      thumbnail_url: thumbnailUrl || null,
      category: category || null,
    };

    if (article) {
      const { error } = await supabase.from("articles").update(payload).eq("id", article.id);
      if (error) {
        toast.error(`更新エラー: ${error.message}`);
      } else {
        toast.success("記事を更新しました");
        onSuccess?.();
        setOpen(false);
      }
    } else {
      const { error } = await supabase.from("articles").insert([
        {
          ...payload,
          available_phases: getStepSettings(companyId).steps.map((s) => s.id),
          is_published: false,
          company_id: companyId || null,
        },
      ]);
      if (error) {
        toast.error(`追加エラー: ${error.message}`);
      } else {
        toast.success("記事を追加しました");
        onSuccess?.();
        setOpen(false);
        resetForm();
      }
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {article ? "記事を編集" : "新しい記事を追加"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="article-title">タイトル *</Label>
            <Input
              id="article-title"
              placeholder="例: 代表メッセージ"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="article-desc">説明</Label>
            <Textarea
              id="article-desc"
              placeholder="記事の説明を入力"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="article-url">記事URL *</Label>
            <Input
              id="article-url"
              placeholder="https://note.com/..."
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="article-thumb">サムネイルURL (任意)</Label>
            <Input
              id="article-thumb"
              placeholder="https://..."
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="article-category">カテゴリ (任意)</Label>
            <Input
              id="article-category"
              placeholder="例: 社員インタビュー"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!title || !contentUrl || loading}
            className="w-full bg-[#0079B3] hover:bg-[#0079B3]/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {article ? "変更を保存" : "追加する"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
