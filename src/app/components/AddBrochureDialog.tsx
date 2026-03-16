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
import { supabase, type Brochure } from "../../lib/supabase";
import { getStepSettings } from "../hooks/useStepSettings";
import { toast } from "sonner";

interface AddBrochureDialogProps {
  children: React.ReactNode;
  onSuccess?: () => void;
  brochure?: Brochure;
  companyId?: string;
}

export function AddBrochureDialog({ children, onSuccess, brochure, companyId }: AddBrochureDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(brochure?.title || "");
  const [description, setDescription] = useState(brochure?.description || "");
  const [fileUrl, setFileUrl] = useState(brochure?.file_url || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(brochure?.thumbnail_url || "");
  const [category, setCategory] = useState(brochure?.category || "");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setFileUrl("");
    setThumbnailUrl("");
    setCategory("");
  };

  const handleSubmit = async () => {
    if (!title || !fileUrl) {
      toast.error("タイトルとURLは必須です");
      return;
    }
    setLoading(true);

    const payload = {
      title,
      description: description || null,
      file_url: fileUrl,
      thumbnail_url: thumbnailUrl || null,
      category: category || null,
    };

    if (brochure) {
      const { error } = await supabase.from("brochures").update(payload).eq("id", brochure.id);
      if (error) {
        toast.error(`更新エラー: ${error.message}`);
      } else {
        toast.success("パンフレットを更新しました");
        onSuccess?.();
        setOpen(false);
      }
    } else {
      const { error } = await supabase.from("brochures").insert([
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
        toast.success("パンフレットを追加しました");
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
            {brochure ? "パンフレットを編集" : "新しいパンフレットを追加"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="brochure-title">タイトル *</Label>
            <Input
              id="brochure-title"
              placeholder="例: 会社案内2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brochure-desc">説明</Label>
            <Textarea
              id="brochure-desc"
              placeholder="パンフレットの説明を入力"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brochure-url">ファイルURL * (PDF・画像のリンク)</Label>
            <Input
              id="brochure-url"
              placeholder="https://drive.google.com/file/d/..."
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brochure-thumb">サムネイルURL (任意)</Label>
            <Input
              id="brochure-thumb"
              placeholder="https://..."
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brochure-category">カテゴリ (任意)</Label>
            <Input
              id="brochure-category"
              placeholder="例: 企業情報"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!title || !fileUrl || loading}
            className="w-full bg-[#0079B3] hover:bg-[#0079B3]/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {brochure ? "変更を保存" : "追加する"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
