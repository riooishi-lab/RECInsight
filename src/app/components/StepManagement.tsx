import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { supabase } from "../../lib/supabase";
import type { Video } from "../../lib/supabase";
import {
  Target, TrendingUp, CheckCircle2, Video as VideoIcon,
  Settings2, Loader2, Star, Award, Trophy, Info,
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
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import {
  useStepSettings,
  generateStepConfigs,
  type StepConfig,
} from "../hooks/useStepSettings";

// ─── アイコン (ステップ数に応じて循環)
const STEP_ICONS = [Target, TrendingUp, CheckCircle2, Star, Award, Trophy];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "目標の魅力": return "目標";
    case "人材の魅力": return "人材";
    case "活動の魅力": return "活動";
    case "条件の魅力": return "条件";
    default: return "";
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "目標の魅力": return "bg-[#5CA7D1] text-white";
    case "人材の魅力": return "bg-[#7DBDDD] text-white";
    case "活動の魅力": return "bg-[#0079B3] text-white";
    case "条件の魅力": return "bg-[#5CA7D1] text-white";
    default: return "bg-gray-600 text-white";
  }
};

export function StepManagement() {
  const { settings, updateSettings } = useStepSettings();

  // ── ビデオ一覧 & 割り当て
  const [videosList, setVideosList] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [videoStepAssignments, setVideoStepAssignments] = useState<Record<string, string[]>>({});

  // ── 設定パネルの下書き状態
  const [draftEnabled, setDraftEnabled] = useState(settings.enabled);
  const [draftStepCount, setDraftStepCount] = useState(settings.steps.length);
  const [applyingSettings, setApplyingSettings] = useState(false);

  const hasPendingChanges =
    draftEnabled !== settings.enabled || draftStepCount !== settings.steps.length;

  // ── 動画取得
  const fetchVideos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("videos").select("*");
    if (error) {
      toast.error(`動画取得エラー: ${error.message}`);
    } else {
      const list = data || [];
      setVideosList(list);

      const allStepIds = settings.steps.map((s) => s.id);
      const assignments: Record<string, string[]> = {};
      list.forEach((video) => {
        const phases = (video.available_phases as string[]) || [];
        assignments[video.id] = phases.filter((p) => allStepIds.includes(p));
      });
      setVideoStepAssignments(assignments);
    }
    setLoading(false);
  }, [settings.steps]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // ── 設定を適用（Supabase移行 + localStorage保存）
  const applySettings = async () => {
    setApplyingSettings(true);
    try {
      const newSteps = generateStepConfigs(draftStepCount);
      const oldSteps = settings.steps;

      // 動画の割り当てを新しいステップ定義に従いマイグレーション
      if (draftEnabled) {
        const { data: videos } = await supabase.from("videos").select("id, available_phases");
        if (videos && oldSteps.length > 0) {
          const oldStepIds = oldSteps.map((s) => s.id);
          const newStepIds = newSteps.map((s) => s.id);

          const updates = videos.map((video) => {
            const current = (video.available_phases as string[]) || [];
            if (current.length === 0) return null;

            // 旧設定で最小ステップインデックスを探す
            const minOldIdx = Math.min(
              ...current.map((s) => oldStepIds.indexOf(s)).filter((i) => i >= 0)
            );
            if (minOldIdx === Infinity || minOldIdx < 0) return null;

            // その最小ステップの先頭フェーズ
            const firstPhase = oldSteps[minOldIdx]?.phases[0];
            if (!firstPhase) return null;

            // 新ステップでそのフェーズを持つステップを探す
            const newStartIdx = newSteps.findIndex((s) =>
              (s.phases as string[]).includes(firstPhase)
            );
            if (newStartIdx === -1) return null;

            const newAvailable = newStepIds.slice(newStartIdx);
            return supabase
              .from("videos")
              .update({ available_phases: newAvailable })
              .eq("id", video.id);
          }).filter(Boolean);

          await Promise.all(updates);
        }
      }

      updateSettings({ enabled: draftEnabled, steps: newSteps });
      toast.success("ステップ設定を保存しました");
    } catch (e: any) {
      toast.error(`設定適用エラー: ${e.message}`);
    } finally {
      setApplyingSettings(false);
    }
  };

  // ── 動画公開ステップのトグル
  const toggleVideoStep = (videoId: string, stepId: string) => {
    setVideoStepAssignments((prev) => {
      const current = prev[videoId] || [];
      const allIds = settings.steps.map((s) => s.id);
      const idx = allIds.indexOf(stepId);
      if (idx === -1) return prev;

      let next: string[];
      if (current.includes(stepId)) {
        // 解除: このステップより後のみ残す
        next = allIds.slice(idx + 1).filter((s) => current.includes(s));
      } else {
        // 選択: このステップ以降を全選択
        next = allIds.slice(idx);
      }
      return { ...prev, [videoId]: next };
    });
  };

  // ── 公開設定保存
  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = videosList.map((video) => {
        const assigned = videoStepAssignments[video.id] || [];
        return supabase
          .from("videos")
          .update({ available_phases: assigned })
          .eq("id", video.id);
      });
      await Promise.all(updates);
      toast.success("公開設定を保存しました");
      setIsEditDialogOpen(false);
      fetchVideos();
    } catch (e: any) {
      toast.error(`保存エラー: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── ステップで最初に公開される動画を取得
  const getVideosForStep = (stepId: string) => {
    const allIds = settings.steps.map((s) => s.id);
    return videosList.filter((video) => {
      const assigned = videoStepAssignments[video.id] || [];
      if (assigned.length === 0) return false;
      const minIdx = Math.min(
        ...assigned.map((s) => allIds.indexOf(s)).filter((i) => i >= 0)
      );
      return allIds[minIdx] === stepId;
    });
  };

  if (loading) {
    return <div className="py-20 text-center text-gray-400 animate-pulse">読み込み中...</div>;
  }

  // ── プレビュー用ステップ（下書き）
  const previewSteps: StepConfig[] = generateStepConfigs(draftStepCount);

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">ステップ管理</h2>
          <p className="text-gray-500 mt-1">採用フェーズごとの動画公開戦略を管理</p>
        </div>
        {settings.enabled && (
          <Button
            onClick={() => setIsEditDialogOpen(true)}
            className="gap-2 bg-[#0079B3] hover:bg-[#0079B3]/90"
          >
            <Settings2 className="h-4 w-4" />
            動画の公開設定を編集
          </Button>
        )}
      </div>

      {/* ─── 設定カード ─── */}
      <Card className="border-2 border-gray-200">
        <CardHeader className="bg-gray-50 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5 text-[#0079B3]" />
            ステップ管理設定
          </CardTitle>
          <CardDescription>
            採用フローに合わせてステップ数・有効/無効を設定できます
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* ON / OFF トグル */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-white">
            <div>
              <p className="font-medium">ステップ管理を有効にする</p>
              <p className="text-sm text-gray-500 mt-0.5">
                無効にすると、学生ポータルで全動画が公開されます（フェーズ管理不要の場合）
              </p>
            </div>
            <Switch
              checked={draftEnabled}
              onCheckedChange={setDraftEnabled}
            />
          </div>

          {/* ステップ数設定（有効時のみ表示）*/}
          {draftEnabled && (
            <div className="space-y-4">
              <div>
                <p className="font-medium mb-1">ステップ数</p>
                <p className="text-sm text-gray-500 mb-3">
                  採用フローを何ステップに分けるかを選択してください
                </p>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      onClick={() => setDraftStepCount(n)}
                      className={`w-12 h-12 rounded-lg border-2 font-bold text-lg transition-colors ${
                        draftStepCount === n
                          ? "border-[#0079B3] bg-[#E1F1F9] text-[#0079B3]"
                          : "border-gray-200 hover:border-gray-300 text-gray-600"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* フェーズ割り当てプレビュー */}
              <div className="p-4 rounded-lg border bg-white">
                <p className="text-sm font-medium text-gray-700 mb-3">フェーズ割り当てプレビュー</p>
                <div className="space-y-2">
                  {previewSteps.map((step) => (
                    <div key={step.id} className="flex items-center gap-3">
                      <span
                        className="text-sm font-bold w-16 shrink-0"
                        style={{ color: step.color }}
                      >
                        {step.id}
                      </span>
                      <div className="flex flex-wrap gap-1">
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
                      <span className="text-xs text-gray-400">{step.subtitle}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ステップ変更の注意 */}
              {draftStepCount !== settings.steps.length && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    ステップ数を変更すると、既存の動画公開設定が新しいステップ定義に自動で移行されます。
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 適用ボタン（変更がある時のみ表示）*/}
          {hasPendingChanges && (
            <div className="flex justify-end">
              <Button
                className="bg-[#0079B3] hover:bg-[#0079B3]/90 gap-2"
                onClick={applySettings}
                disabled={applyingSettings}
              >
                {applyingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
                設定を適用する
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── ステップ管理が無効の場合 ─── */}
      {!settings.enabled && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-gray-400 space-y-2">
            <VideoIcon className="h-12 w-12 mx-auto opacity-30" />
            <p className="font-medium">ステップ管理は無効です</p>
            <p className="text-sm">有効にすると、ステップごとの動画公開戦略を設定できます。</p>
          </CardContent>
        </Card>
      )}

      {/* ─── ステップカード（有効時のみ）─── */}
      {settings.enabled && (
        <>
          <div className="space-y-6">
            {settings.steps.map((step, idx) => {
              const Icon = STEP_ICONS[idx % STEP_ICONS.length];
              const stepVideos = getVideosForStep(step.id);

              const videosByCategory = stepVideos.reduce((acc, video) => {
                const cat = video.category || "未分類";
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(video);
                return acc;
              }, {} as Record<string, Video[]>);

              return (
                <Card key={step.id} className="border-2" style={{ borderColor: step.color }}>
                  <CardHeader style={{ backgroundColor: step.bgColor }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-3 text-2xl">
                          <Icon className="h-7 w-7" style={{ color: step.color }} />
                          <div>
                            <div>{step.name}</div>
                            <div className="text-base font-normal text-gray-600 mt-1">
                              {step.subtitle}
                            </div>
                          </div>
                        </CardTitle>
                        {step.purpose && (
                          <CardDescription className="mt-3 text-base">
                            <strong className="text-gray-900">目的：</strong>
                            {step.purpose}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {step.phases.map((phase) => (
                          <Badge
                            key={phase}
                            variant="secondary"
                            className="text-sm"
                            style={{ backgroundColor: step.color, color: "white" }}
                          >
                            {phase}フェーズ
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <VideoIcon className="h-5 w-5" style={{ color: step.color }} />
                          開放する動画
                        </h3>
                        <Badge variant="outline" className="text-sm">
                          {stepVideos.length}本
                        </Badge>
                      </div>

                      {stepVideos.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          このステップで新たに公開する動画はありません
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {Object.entries(videosByCategory).map(([category, catVideos]) => (
                            <div key={category} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge className={`${getCategoryColor(category)} text-xs`}>
                                  {getCategoryIcon(category)}
                                </Badge>
                                <span className="font-medium text-sm text-gray-700">
                                  {category}
                                </span>
                              </div>
                              <div className="ml-6 space-y-1">
                                {catVideos.map((video) => (
                                  <div
                                    key={video.id}
                                    className="flex items-center gap-2 text-sm p-2 rounded hover:bg-gray-50 transition-colors"
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ backgroundColor: step.color }}
                                    />
                                    <span className="text-gray-700">{video.title}</span>
                                    <Badge variant="outline" className="ml-auto text-xs">
                                      {video.subcategory || "なし"}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* 統計情報 */}
          <Card className="bg-gradient-to-r from-[#E1F1F9] to-[#E8F4F8]">
            <CardHeader>
              <CardTitle className="text-lg">ステップ別動画配信戦略</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="grid gap-6"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(settings.steps.length, 6)}, minmax(0, 1fr))`,
                }}
              >
                {settings.steps.map((step) => {
                  const stepVideos = getVideosForStep(step.id);
                  return (
                    <div key={step.id} className="text-center">
                      <div className="text-3xl font-bold" style={{ color: step.color }}>
                        {stepVideos.length}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{step.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {step.phases.join("・")}フェーズ
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ─── 動画公開設定ダイアログ ─── */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>動画の公開ステップ設定</DialogTitle>
            <DialogDescription>
              各動画をどのステップから公開するかを選択してください。選択したステップ以降で自動的に公開されます。
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-1">
              {videosList.length === 0 ? (
                <div className="py-10 text-center text-gray-400">動画が登録されていません</div>
              ) : (
                videosList.map((video) => {
                  const assignedSteps = videoStepAssignments[video.id] || [];
                  return (
                    <div
                      key={video.id}
                      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{video.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            className={`${getCategoryColor(video.category || "未分類")} text-xs`}
                          >
                            {getCategoryIcon(video.category || "未分類")}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {video.subcategory || "なし"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {settings.steps.map((step) => (
                          <div key={step.id} className="flex items-center gap-1.5">
                            <Checkbox
                              id={`${video.id}-${step.id}`}
                              checked={assignedSteps.includes(step.id)}
                              onCheckedChange={() => toggleVideoStep(video.id, step.id)}
                            />
                            <label
                              htmlFor={`${video.id}-${step.id}`}
                              className="text-sm font-medium cursor-pointer whitespace-nowrap"
                              style={{ color: step.color }}
                            >
                              {step.id}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              キャンセル
            </Button>
            <Button
              className="bg-[#0079B3] hover:bg-[#0079B3]/90"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
