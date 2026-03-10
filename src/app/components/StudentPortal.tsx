import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { getStepSettings } from "../hooks/useStepSettings";
import { BRIEFING_CATEGORY } from "./AddVideoDialog";
import type { Student, Video, Brochure, Article, WatchEventType } from "../../lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { Play, Clock, ArrowLeft, AlertCircle, BookOpen, FileText, ExternalLink } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ImageWithFallback } from "./figma/ImageWithFallback";

// ─── Window 拡張のみ宣言（YT名前空間はグローバルで定義済みのため省略）
declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

// ─── YouTube ID を抽出する（多様な形式に対応）
const extractYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
};

const getThumbnail = (video: Video) => {
    if (video.thumbnail_url) return video.thumbnail_url;
    const youtubeId = video.video_url ? extractYouTubeId(video.video_url) : null;
    if (youtubeId) return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    return null;
};

// ─── 視聴イベント記録フック
function useWatchTracker(studentId: string | null, videoId: string | null) {
    const sessionId = useRef<string | null>(null);
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearHeartbeat = useCallback(() => {
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
    }, []);

    const recordEvent = useCallback(async (eventType: WatchEventType, positionSec: number) => {
        if (!studentId || !videoId) return;
        await supabase.from("watch_events").insert({
            student_id: studentId,
            video_id: videoId,
            event_type: eventType,
            position_sec: positionSec,
            session_id: sessionId.current,
        });
    }, [studentId, videoId]);

    const onPlay = useCallback((getCurrentTime: () => number) => {
        sessionId.current = uuidv4();
        recordEvent("play", getCurrentTime());
        heartbeatRef.current = setInterval(() => {
            recordEvent("heartbeat", getCurrentTime());
        }, 5000);
    }, [recordEvent]);

    const onPause = useCallback((positionSec: number) => {
        recordEvent("pause", positionSec);
        clearHeartbeat();
    }, [recordEvent, clearHeartbeat]);

    const onEnded = useCallback((positionSec: number) => {
        recordEvent("ended", positionSec);
        clearHeartbeat();
    }, [recordEvent, clearHeartbeat]);

    const onSeek = useCallback((positionSec: number) => {
        recordEvent("seek", positionSec);
    }, [recordEvent]);

    useEffect(() => () => clearHeartbeat(), [clearHeartbeat]);

    return { onPlay, onPause, onEnded, onSeek };
}

// ─── VideoPlayer コンポーネント
interface VideoPlayerProps {
    video: Video;
    studentId: string;
    onBack: () => void;
}

function VideoPlayer({ video, studentId, onBack }: VideoPlayerProps) {
    const playerDivId = `yt-player-${video.id}`;
    const playerRef = useRef<any>(null);
    const tracker = useWatchTracker(studentId, video.id);
    const youtubeId = video.video_url ? extractYouTubeId(video.video_url) : null;

    useEffect(() => {
        if (!youtubeId) return;

        const initPlayer = () => {
            playerRef.current = new window.YT.Player(playerDivId, {
                videoId: youtubeId,
                playerVars: { rel: 0, modestbranding: 1 },
                events: {
                    onStateChange: (event: any) => {
                        const p = playerRef.current;
                        if (!p) return;
                        const pos = p.getCurrentTime();
                        if (event.data === window.YT.PlayerState.PLAYING) {
                            tracker.onPlay(() => p.getCurrentTime());
                        } else if (event.data === window.YT.PlayerState.PAUSED) {
                            tracker.onPause(pos);
                        } else if (event.data === window.YT.PlayerState.ENDED) {
                            tracker.onEnded(p.getDuration());
                        }
                    },
                },
            });
        };

        if (window.YT?.Player) {
            initPlayer();
        } else {
            const tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(tag);
            window.onYouTubeIframeAPIReady = initPlayer;
        }

        return () => { playerRef.current?.destroy(); };
    }, [youtubeId, playerDivId, tracker]);

    if (!youtubeId) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" onClick={onBack} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> 一覧に戻る
                </Button>
                <div className="rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                    <div className="text-white text-center space-y-2">
                        <Play className="h-16 w-16 mx-auto opacity-40" />
                        <p className="opacity-60">この動画は準備中です</p>
                    </div>
                </div>
                <h2 className="text-2xl font-bold">{video.title}</h2>
                {video.description && <p className="text-gray-600">{video.description}</p>}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Button variant="ghost" onClick={onBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> 一覧に戻る
            </Button>
            <div className="rounded-lg overflow-hidden bg-black aspect-video">
                <div id={playerDivId} className="w-full h-full" />
            </div>
            <div>
                <h2 className="text-2xl font-bold">{video.title}</h2>
                {video.description && <p className="text-gray-600 mt-1">{video.description}</p>}
                {video.duration_sec && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
                        <Clock className="h-4 w-4" />
                        {Math.floor(video.duration_sec / 60)}分
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── パンフレットカード ───
function BrochureCard({ brochure }: { brochure: Brochure }) {
    return (
        <Card
            className="group hover:shadow-lg transition-all cursor-pointer"
            onClick={() => window.open(brochure.file_url || "#", "_blank", "noopener")}
        >
            <CardContent className="p-0">
                <div className="relative aspect-[3/4] bg-gray-100 rounded-t-lg flex items-center justify-center overflow-hidden">
                    {brochure.thumbnail_url ? (
                        <ImageWithFallback
                            src={brochure.thumbnail_url}
                            alt={brochure.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-[#0079B3] transition-colors">
                            <BookOpen className="h-12 w-12" />
                            <span className="text-xs">PDF</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-white rounded-full px-3 py-1 flex items-center gap-1 text-sm font-medium text-[#0079B3]">
                            <ExternalLink className="h-4 w-4" />
                            開く
                        </div>
                    </div>
                </div>
                <div className="p-4 space-y-2">
                    <h3 className="font-semibold line-clamp-2 group-hover:text-[#0079B3] transition-colors">
                        {brochure.title}
                    </h3>
                    {brochure.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{brochure.description}</p>
                    )}
                    {brochure.category && (
                        <Badge variant="secondary" className="text-xs">{brochure.category}</Badge>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// ─── 記事カード ───
function ArticleCard({ article }: { article: Article }) {
    return (
        <Card
            className="group hover:shadow-lg transition-all cursor-pointer"
            onClick={() => window.open(article.content_url || "#", "_blank", "noopener")}
        >
            <CardContent className="p-0">
                <div className="relative aspect-video bg-gray-100 rounded-t-lg flex items-center justify-center overflow-hidden">
                    {article.thumbnail_url ? (
                        <ImageWithFallback
                            src={article.thumbnail_url}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-[#0079B3] transition-colors">
                            <FileText className="h-12 w-12" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-white rounded-full px-3 py-1 flex items-center gap-1 text-sm font-medium text-[#0079B3]">
                            <ExternalLink className="h-4 w-4" />
                            読む
                        </div>
                    </div>
                </div>
                <div className="p-4 space-y-2">
                    <h3 className="font-semibold line-clamp-2 group-hover:text-[#0079B3] transition-colors">
                        {article.title}
                    </h3>
                    {article.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{article.description}</p>
                    )}
                    {article.category && (
                        <Badge variant="secondary" className="text-xs">{article.category}</Badge>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// ─── メイン StudentPortal コンポーネント ───
export function StudentPortal() {
    const [student, setStudent] = useState<Student | null>(null);
    const [videos, setVideos] = useState<Video[]>([]);
    const [brochures, setBrochures] = useState<Brochure[]>([]);
    const [articles, setArticles] = useState<Article[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let currentStep = "STEP1";

        const fetchContent = async (step: string) => {
            const stepSettings = getStepSettings();

            // ─── 動画取得（公開中 + ステップフィルタ） ───
            let videoQuery = supabase
                .from("videos")
                .select("*")
                .eq("is_published", true);

            if (stepSettings.enabled) {
                videoQuery = videoQuery.contains("available_phases", [step]);
            }

            const { data: videoData } = await videoQuery;
            setVideos(videoData || []);

            // ─── パンフレット取得（公開中 + ステップフィルタ） ───
            // available_phases は JSONB 型のため、クライアント側でフィルタリング
            const { data: brochureData } = await supabase
                .from("brochures")
                .select("*")
                .eq("is_published", true);
            setBrochures(
                stepSettings.enabled
                    ? (brochureData || []).filter((b) =>
                          Array.isArray(b.available_phases) && b.available_phases.includes(step)
                      )
                    : (brochureData || [])
            );

            // ─── 記事取得（公開中 + ステップフィルタ） ───
            // available_phases は JSONB 型のため、クライアント側でフィルタリング
            const { data: articleData } = await supabase
                .from("articles")
                .select("*")
                .eq("is_published", true);
            setArticles(
                stepSettings.enabled
                    ? (articleData || []).filter((a) =>
                          Array.isArray(a.available_phases) && a.available_phases.includes(step)
                      )
                    : (articleData || [])
            );
        };

        const init = async () => {
            const params = new URLSearchParams(window.location.search);
            const token = params.get("token");

            if (!token) {
                setError("URLにトークンが含まれていません。正しいURLからアクセスしてください。");
                setLoading(false);
                return;
            }

            const { data: studentData, error: studentError } = await supabase
                .from("students")
                .select("*")
                .eq("token", token)
                .single();

            if (studentError || !studentData) {
                setError("URLが無効または期限切れです。採用担当者にご連絡ください。");
                setLoading(false);
                return;
            }

            setStudent(studentData);

            const stepSettings = getStepSettings();

            // ─── 現在のステップを特定 ───
            currentStep = stepSettings.steps[0]?.id ?? "STEP1";
            if (stepSettings.enabled) {
                for (const step of stepSettings.steps) {
                    if ((step.phases as string[]).includes(studentData.phase)) {
                        currentStep = step.id;
                        break;
                    }
                }
            }

            await fetchContent(currentStep);
            setLoading(false);
        };

        init();

        // ─── リアルタイム購読（公開状態の変更を即時反映） ───
        const videoChannel = supabase
            .channel("student-video-changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "videos" }, () =>
                fetchContent(currentStep)
            )
            .subscribe();

        const brochureChannel = supabase
            .channel("student-brochure-changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "brochures" }, () =>
                fetchContent(currentStep)
            )
            .subscribe();

        const articleChannel = supabase
            .channel("student-article-changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "articles" }, () =>
                fetchContent(currentStep)
            )
            .subscribe();

        // ─── ポーリング（Realtime 未設定テーブルへのフォールバック、30秒ごと） ───
        const pollingInterval = setInterval(() => {
            fetchContent(currentStep);
        }, 30000);

        // ─── タブ復帰時に即時再取得 ───
        const handleVisibilityChange = () => {
            if (!document.hidden) fetchContent(currentStep);
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            supabase.removeChannel(videoChannel);
            supabase.removeChannel(brochureChannel);
            supabase.removeChannel(articleChannel);
            clearInterval(pollingInterval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center space-y-3 animate-pulse">
                    <div className="w-12 h-12 bg-blue-200 rounded-full mx-auto" />
                    <p className="text-gray-500">読み込み中...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="max-w-md w-full mx-4">
                    <CardContent className="p-8 text-center space-y-4">
                        <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
                        <h1 className="text-xl font-bold text-gray-800">アクセスできません</h1>
                        <p className="text-gray-600 text-sm">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!student) return null;

    const briefingVideos = videos.filter((v) => v.category === BRIEFING_CATEGORY);
    const regularVideos = videos.filter((v) => v.category !== BRIEFING_CATEGORY);
    const totalContent = videos.length + brochures.length + articles.length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ヘッダー */}
            <header className="bg-gradient-to-r from-[#0079B3] to-[#5CA7D1] text-white px-6 py-6">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <h1 className="text-xl font-bold">採用情報ポータル</h1>
                    <div className="text-right text-sm">
                        <div className="font-medium text-lg">{student.name} 様</div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8">
                {selectedVideo ? (
                    <VideoPlayer
                        video={selectedVideo}
                        studentId={student.id}
                        onBack={() => setSelectedVideo(null)}
                    />
                ) : (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold">{student.name} 様へのコンテンツ</h2>
                            <p className="text-gray-500 mt-1">限定公開のコンテンツです。ぜひご覧ください。</p>
                        </div>

                        {/* 会社説明会動画（最上部に大きく表示） */}
                        {briefingVideos.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-[#0079B3]">会社説明会</h3>
                                    <span className="text-xs bg-[#0079B3] text-white px-2 py-0.5 rounded-full">必見</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {briefingVideos.map((video) => (
                                        <Card
                                            key={video.id}
                                            className="group hover:shadow-xl transition-all cursor-pointer border-[#0079B3]/20"
                                            onClick={() => setSelectedVideo(video)}
                                        >
                                            <CardContent className="p-0">
                                                <div className="relative aspect-video bg-gray-100 rounded-t-lg flex items-center justify-center overflow-hidden">
                                                    <ImageWithFallback
                                                        src={getThumbnail(video) || ""}
                                                        alt={video.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                                                    />
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                                                            <Play className="h-8 w-8 text-[#0079B3] ml-1" fill="currentColor" />
                                                        </div>
                                                    </div>
                                                    {video.duration_sec && (
                                                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {Math.floor(video.duration_sec / 60)}分
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-5 space-y-2">
                                                    <h3 className="text-base font-bold line-clamp-2 group-hover:text-[#0079B3] transition-colors">
                                                        {video.title}
                                                    </h3>
                                                    {video.description && (
                                                        <p className="text-sm text-gray-600 line-clamp-2">{video.description}</p>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {totalContent === 0 ? (
                            <div className="text-center py-16 text-gray-400">
                                <Play className="h-12 w-12 mx-auto mb-3 opacity-40" />
                                <p>現在公開中のコンテンツはありません</p>
                            </div>
                        ) : (regularVideos.length > 0 || brochures.length > 0 || articles.length > 0) && (
                            <Tabs defaultValue="videos">
                                <TabsList className="grid grid-cols-3 max-w-sm">
                                    <TabsTrigger value="videos" className="gap-1.5">
                                        <Play className="h-3.5 w-3.5" />
                                        動画 ({regularVideos.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="brochures" className="gap-1.5">
                                        <BookOpen className="h-3.5 w-3.5" />
                                        パンフ ({brochures.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="articles" className="gap-1.5">
                                        <FileText className="h-3.5 w-3.5" />
                                        記事 ({articles.length})
                                    </TabsTrigger>
                                </TabsList>

                                {/* 動画タブ */}
                                <TabsContent value="videos" className="mt-6">
                                    {regularVideos.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400">
                                            <Play className="h-10 w-10 mx-auto mb-2 opacity-40" />
                                            <p>公開中の動画はありません</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {regularVideos.map((video) => (
                                                <Card
                                                    key={video.id}
                                                    className="group hover:shadow-lg transition-all cursor-pointer"
                                                    onClick={() => setSelectedVideo(video)}
                                                >
                                                    <CardContent className="p-0">
                                                        <div className="relative aspect-video bg-gray-100 rounded-t-lg flex items-center justify-center overflow-hidden">
                                                            <ImageWithFallback
                                                                src={getThumbnail(video) || ""}
                                                                alt={video.title}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                                                            />
                                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
                                                                    <Play className="h-7 w-7 text-[#0079B3] ml-1" fill="currentColor" />
                                                                </div>
                                                            </div>
                                                            {video.duration_sec && (
                                                                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {Math.floor(video.duration_sec / 60)}分
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="p-4 space-y-2">
                                                            <h3 className="font-semibold line-clamp-2 group-hover:text-[#0079B3] transition-colors">
                                                                {video.title}
                                                            </h3>
                                                            {video.description && (
                                                                <p className="text-sm text-gray-600 line-clamp-2">{video.description}</p>
                                                            )}
                                                            {video.category && (
                                                                <Badge variant="secondary" className="text-xs">{video.category}</Badge>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                {/* パンフレットタブ */}
                                <TabsContent value="brochures" className="mt-6">
                                    {brochures.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400">
                                            <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
                                            <p>公開中のパンフレットはありません</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                            {brochures.map((brochure) => (
                                                <BrochureCard key={brochure.id} brochure={brochure} />
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                {/* 記事タブ */}
                                <TabsContent value="articles" className="mt-6">
                                    {articles.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400">
                                            <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                                            <p>公開中の記事はありません</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {articles.map((article) => (
                                                <ArticleCard key={article.id} article={article} />
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
