import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Play, Pause, CheckCircle2 } from "lucide-react";

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
            onStateChange?: (e: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  seekTo(sec: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  playVideo(): void;
  pauseVideo(): void;
  getPlayerState(): number;
  destroy(): void;
}

interface VideoThumbnailScrubberProps {
  open: boolean;
  onClose: () => void;
  videoId: string;
  onSelect: (thumbnailUrl: string) => void;
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedThumbnail, setSelectedThumbnail] = useState(
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  );
  const [customUrl, setCustomUrl] = useState("");

  // YouTubeサムネイル候補（4フレーム）
  const thumbnailOptions = [
    { label: "デフォルト", url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` },
    { label: "フレーム①", url: `https://img.youtube.com/vi/${videoId}/1.jpg` },
    { label: "フレーム②", url: `https://img.youtube.com/vi/${videoId}/2.jpg` },
    { label: "フレーム③", url: `https://img.youtube.com/vi/${videoId}/3.jpg` },
  ];

  const initPlayer = useCallback(() => {
    if (!playerContainerRef.current || !window.YT?.Player) return;

    // コンテナをリセット
    playerContainerRef.current.innerHTML = "";
    const el = document.createElement("div");
    playerContainerRef.current.appendChild(el);

    playerRef.current = new window.YT.Player(el, {
      videoId,
      playerVars: {
        controls: 1,
        modestbranding: 1,
        rel: 0,
        fs: 0,
      },
      events: {
        onReady: (e) => {
          setDuration(e.target.getDuration());
          setPlayerReady(true);
          pollRef.current = setInterval(() => {
            if (!playerRef.current) return;
            setCurrentTime(playerRef.current.getCurrentTime());
            setIsPlaying(playerRef.current.getPlayerState() === 1);
          }, 250);
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

    // ダイアログ表示後に少し遅延してプレイヤー初期化
    const timer = setTimeout(setup, 100);

    return () => {
      clearTimeout(timer);
      if (pollRef.current) clearInterval(pollRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
      setPlayerReady(false);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
    };
  }, [open, initPlayer]);

  const handleSeek = (value: number[]) => {
    const t = value[0];
    playerRef.current?.seekTo(t, true);
    playerRef.current?.pauseVideo();
    setCurrentTime(t);
  };

  const handleSeekInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    if (!isNaN(t) && t >= 0 && t <= duration) {
      playerRef.current?.seekTo(t, true);
      playerRef.current?.pauseVideo();
      setCurrentTime(t);
    }
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleConfirm = () => {
    const url = customUrl.trim() || selectedThumbnail;
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
          {/* YouTube Player */}
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <div ref={playerContainerRef} className="w-full h-full [&>div]:w-full [&>div]:h-full" />
          </div>

          {/* カスタムスクラバー */}
          {playerReady && duration > 0 ? (
            <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-8 h-8 rounded-full bg-[#0079B3] text-white flex items-center justify-center flex-shrink-0"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </button>
                <div className="flex-1">
                  <Slider
                    min={0}
                    max={Math.floor(duration)}
                    step={1}
                    value={[Math.floor(currentTime)]}
                    onValueChange={handleSeek}
                    className="w-full"
                  />
                </div>
                <span className="text-sm font-mono text-gray-600 w-20 text-right flex-shrink-0">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="seek-seconds" className="text-xs text-gray-500 flex-shrink-0">
                  秒数で移動:
                </Label>
                <Input
                  id="seek-seconds"
                  type="number"
                  min={0}
                  max={Math.floor(duration)}
                  value={Math.floor(currentTime)}
                  onChange={handleSeekInput}
                  className="w-24 h-7 text-sm"
                />
                <span className="text-xs text-gray-400">秒</span>
              </div>

              <p className="text-xs text-gray-400">
                スライダーまたは秒数を入力して、プレイヤーで目的のフレームを確認してください
              </p>
            </div>
          ) : (
            <div className="py-3 text-center text-sm text-gray-400 animate-pulse">
              プレイヤーを読み込み中...
            </div>
          )}

          {/* YouTubeの自動生成サムネイルから選択 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              YouTubeの自動生成サムネイルから選ぶ
            </p>
            <div className="grid grid-cols-4 gap-2">
              {thumbnailOptions.map((opt) => (
                <button
                  key={opt.url}
                  onClick={() => { setSelectedThumbnail(opt.url); setCustomUrl(""); }}
                  className={`relative rounded-md overflow-hidden border-2 transition-all ${
                    selectedThumbnail === opt.url && !customUrl.trim()
                      ? "border-[#0079B3] ring-2 ring-[#0079B3]/20"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <img
                    src={opt.url}
                    alt={opt.label}
                    className="w-full aspect-video object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "0.3";
                    }}
                  />
                  {selectedThumbnail === opt.url && !customUrl.trim() && (
                    <div className="absolute top-1 right-1">
                      <CheckCircle2 className="h-4 w-4 text-[#0079B3] bg-white rounded-full" />
                    </div>
                  )}
                  <span className="absolute bottom-0 left-0 right-0 text-xs bg-black/50 text-white text-center py-0.5">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400">
              ※ ブラウザのセキュリティ制限により、任意のフレームの自動キャプチャはできません。
              上記4枚から選ぶか、スクリーンショットを撮って画像URLを入力してください。
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
              onChange={(e) => setCustomUrl(e.target.value)}
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

          {/* 設定中のサムネイルプレビュー */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <img
              src={customUrl.trim() || selectedThumbnail}
              alt="設定するサムネイル"
              className="h-14 aspect-video object-cover rounded border"
              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
            />
            <div>
              <p className="text-xs text-gray-500">設定するサムネイル</p>
              <p className="text-sm font-medium text-[#0079B3]">
                {customUrl.trim() ? "カスタムURL" : thumbnailOptions.find(o => o.url === selectedThumbnail)?.label}
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
