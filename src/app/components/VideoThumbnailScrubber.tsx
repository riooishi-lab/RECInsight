import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { CheckCircle2 } from "lucide-react";

declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}

interface VideoThumbnailScrubberProps {
  open: boolean;
  onClose: () => void;
  videoId: string;
  onSelect: (thumbnailUrl: string) => void;
}

// 再生位置（0〜1）から最も近いYouTubeサムネイルURLを返す
// YouTube自動生成: 1.jpg≈25%, 2.jpg≈50%, 3.jpg≈75%
function getAutoThumbnailByPosition(videoId: string, position: number): string {
  if (position < 0.375) return `https://img.youtube.com/vi/${videoId}/1.jpg`;
  if (position < 0.625) return `https://img.youtube.com/vi/${videoId}/2.jpg`;
  return `https://img.youtube.com/vi/${videoId}/3.jpg`;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoThumbnailScrubber({ open, onClose, videoId, onSelect }: VideoThumbnailScrubberProps) {
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [playerReady, setPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // null = プレイヤー位置に連動、string = 手動選択済み
  const [manualSelection, setManualSelection] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState("");

  const thumbnailOptions = [
    { label: "フレーム①（前半）", url: `https://img.youtube.com/vi/${videoId}/1.jpg` },
    { label: "フレーム②（中盤）", url: `https://img.youtube.com/vi/${videoId}/2.jpg` },
    { label: "フレーム③（後半）", url: `https://img.youtube.com/vi/${videoId}/3.jpg` },
  ];

  // プレイヤー位置 or 手動選択から決まる現在の選択サムネイル
  const autoSelected =
    duration > 0
      ? getAutoThumbnailByPosition(videoId, currentTime / duration)
      : thumbnailOptions[0].url;
  const activeThumbnail = customUrl.trim() ? null : (manualSelection ?? autoSelected);

  const initPlayer = useCallback(() => {
    if (!playerContainerRef.current || !window.YT?.Player) return;

    playerContainerRef.current.innerHTML = "";
    const el = document.createElement("div");
    playerContainerRef.current.appendChild(el);

    playerRef.current = new window.YT.Player(el, {
      videoId,
      playerVars: { controls: 1, modestbranding: 1, rel: 0, fs: 0 },
      events: {
        onReady: (e) => {
          setDuration(e.target.getDuration());
          setPlayerReady(true);
          pollRef.current = setInterval(() => {
            if (!playerRef.current) return;
            setCurrentTime(playerRef.current.getCurrentTime());
          }, 300);
        },
      },
    });
  }, [videoId]);

  useEffect(() => {
    if (!open) return;

    const setup = () => {
      if (window.YT?.Player) {
        initPlayer();
      } else {
        window.onYouTubeIframeAPIReady = initPlayer;
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const script = document.createElement("script");
          script.src = "https://www.youtube.com/iframe_api";
          document.head.appendChild(script);
        }
      }
    };

    const timer = setTimeout(setup, 100);

    return () => {
      clearTimeout(timer);
      if (pollRef.current) clearInterval(pollRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
      setPlayerReady(false);
      setCurrentTime(0);
      setDuration(0);
      setManualSelection(null);
      setCustomUrl("");
    };
  }, [open, initPlayer]);

  const handleConfirm = () => {
    const url = customUrl.trim() || activeThumbnail || autoSelected;
    onSelect(url);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>動画からサムネイルを選ぶ</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* YouTube Player（YouTube側のスクラバーで操作） */}
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <div ref={playerContainerRef} className="w-full h-full [&>div]:w-full [&>div]:h-full" />
          </div>

          {playerReady && duration > 0 && (
            <p className="text-xs text-center text-gray-400">
              現在位置: {formatTime(currentTime)} / {formatTime(duration)}
              　│　YouTube プレイヤーのシークバーで目的のフレームに移動してください
            </p>
          )}
          {!playerReady && (
            <div className="py-2 text-center text-sm text-gray-400 animate-pulse">
              プレイヤーを読み込み中...
            </div>
          )}

          {/* サムネイル選択（プレイヤー位置に応じて自動ハイライト） */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">サムネイルを選ぶ</p>
              {manualSelection && (
                <button
                  className="text-xs text-[#0079B3] underline"
                  onClick={() => setManualSelection(null)}
                >
                  プレイヤー位置に戻す
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {thumbnailOptions.map((opt) => {
                const isActive = activeThumbnail === opt.url;
                return (
                  <button
                    key={opt.url}
                    onClick={() => { setManualSelection(opt.url); setCustomUrl(""); }}
                    className={`relative rounded-md overflow-hidden border-2 transition-all ${
                      isActive
                        ? "border-[#0079B3] ring-2 ring-[#0079B3]/20"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <img
                      src={opt.url}
                      alt={opt.label}
                      className="w-full aspect-video object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                    />
                    {isActive && (
                      <div className="absolute top-1 right-1">
                        <CheckCircle2 className="h-5 w-5 text-[#0079B3] bg-white rounded-full" />
                      </div>
                    )}
                    <span className={`absolute bottom-0 left-0 right-0 text-xs text-white text-center py-0.5 ${isActive ? "bg-[#0079B3]/80" : "bg-black/50"}`}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400">
              プレイヤーのシーク位置に最も近いフレームが自動で選択されます。クリックして手動変更も可能です。
            </p>
          </div>

          {/* カスタムURL入力 */}
          <div className="space-y-2">
            <Label htmlFor="custom-thumbnail-url" className="text-sm font-medium">
              または画像URLを直接入力
            </Label>
            <Input
              id="custom-thumbnail-url"
              placeholder="https://example.com/thumbnail.jpg"
              value={customUrl}
              onChange={(e) => { setCustomUrl(e.target.value); setManualSelection(null); }}
            />
            {customUrl.trim() && (
              <img
                src={customUrl}
                alt="プレビュー"
                className="h-20 rounded border object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </div>

          {/* 確定プレビュー */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <img
              src={customUrl.trim() || activeThumbnail || autoSelected}
              alt="設定するサムネイル"
              className="h-14 aspect-video object-cover rounded border"
              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
            />
            <div>
              <p className="text-xs text-gray-500">設定するサムネイル</p>
              <p className="text-sm font-medium text-[#0079B3]">
                {customUrl.trim()
                  ? "カスタムURL"
                  : thumbnailOptions.find((o) => o.url === activeThumbnail)?.label ?? "—"}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>キャンセル</Button>
          <Button className="bg-[#0079B3] hover:bg-[#0079B3]/90" onClick={handleConfirm}>
            このサムネイルを設定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
