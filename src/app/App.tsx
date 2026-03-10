import { useState } from "react";
import { Overview } from "./components/Overview";
import { PhaseDetail } from "./components/PhaseDetail";
import { VideoAnalytics } from "./components/VideoAnalytics";
import { ContentManagement } from "./components/ContentManagement";
import { StudentManagement } from "./components/StudentManagement";
import { StudentPortal } from "./components/StudentPortal";
import { StepManagement } from "./components/StepManagement";
import { Manual } from "./components/Manual";
import { BarChart3, Home, TrendingUp, FolderOpen, Users, GraduationCap, Book, Layers } from "lucide-react";
import { Toaster } from "sonner";

type View = "overview" | "phases" | "contents" | "content" | "steps" | "students" | "manual";

const VALID_VIEWS: View[] = ["overview", "phases", "contents", "content", "steps", "students", "manual"];

function getInitialView(): View {
  const hash = window.location.hash.replace("#", "") as View;
  return VALID_VIEWS.includes(hash) ? hash : "overview";
}

export default function App() {
  const [currentView, setCurrentView] = useState<View>(getInitialView);

  function navigate(view: View) {
    setCurrentView(view);
    window.location.hash = view;
  }

  // /watch ルートの場合は学生ポータルを表示
  if (window.location.pathname === "/watch") {
    try {
      return (
        <>
          <StudentPortal />
          <Toaster richColors position="top-right" />
        </>
      );
    } catch (e: any) {
      return <div className="p-10 text-red-600 bg-red-50">Portal Error: {e.message}</div>;
    }
  }

  try {
    return (
      <>
        <Toaster richColors position="top-right" />
        <div className="min-h-screen bg-gray-50 flex">
          {/* 左サイドバー */}
          <aside className="w-64 bg-white border-r min-h-screen fixed left-0 top-0">
            {/* ヘッダー */}
            <div className="p-6 border-b">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-[#0079B3]" />
                <div className="flex-1 text-left">
                  <h1 className="font-bold text-[#0079B3]">採用映像分析</h1>
                  <p className="text-xs text-gray-500">Analytics Tool</p>
                </div>
              </div>
            </div>

            {/* ナビゲーション */}
            <nav className="p-4 space-y-1">
              <button
                onClick={() => navigate("overview")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === "overview"
                  ? "bg-[#5CA7D1] text-white font-medium"
                  : "text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <Home className="h-5 w-5" />
                <span>全体概要</span>
              </button>

              <button
                onClick={() => navigate("phases")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === "phases"
                  ? "bg-[#5CA7D1] text-white font-medium"
                  : "text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <Users className="h-5 w-5" />
                <span>フェーズ別分析</span>
              </button>

              <button
                onClick={() => navigate("contents")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === "contents"
                  ? "bg-[#5CA7D1] text-white font-medium"
                  : "text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <TrendingUp className="h-5 w-5" />
                <span>コンテンツ別分析</span>
              </button>

              <button
                onClick={() => navigate("content")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === "content"
                  ? "bg-[#5CA7D1] text-white font-medium"
                  : "text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <FolderOpen className="h-5 w-5" />
                <span>コンテンツ管理</span>
              </button>

              <button
                onClick={() => navigate("steps")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === "steps"
                  ? "bg-[#5CA7D1] text-white font-medium"
                  : "text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <Layers className="h-5 w-5" />
                <span>ステップ管理</span>
              </button>

              <button
                onClick={() => navigate("students")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === "students"
                  ? "bg-[#5CA7D1] text-white font-medium"
                  : "text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <GraduationCap className="h-5 w-5" />
                <span>学生管理</span>
              </button>

              <button
                onClick={() => navigate("manual")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === "manual"
                  ? "bg-[#5CA7D1] text-white font-medium"
                  : "text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <Book className="h-5 w-5" />
                <span>マニュアル</span>
              </button>

            </nav>
          </aside>

          {/* メインコンテンツ */}
          <main className="flex-1 ml-64">
            <div className="container mx-auto px-8 py-8">
              {currentView === "overview" && <Overview />}
              {currentView === "phases" && <PhaseDetail />}
              {currentView === "contents" && <VideoAnalytics />}
              {currentView === "content" && <ContentManagement />}
              {currentView === "steps" && <StepManagement />}
              {currentView === "students" && <StudentManagement />}
              {currentView === "manual" && <Manual />}
            </div>

            {/* フッター */}
            <footer className="bg-white border-t mt-12">
              <div className="container mx-auto px-8 py-4 text-center text-sm text-gray-500">
                © 2026 採用映像分析ツール - 学生の行動を理解し、より良い採用体験を
              </div>
            </footer>
          </main>
        </div>
      </>
    );
  } catch (e: any) {
    return (
      <div className="p-10 text-red-600 bg-red-50 min-h-screen">
        <h1 className="text-2xl font-bold mb-4">レンダリングエラー</h1>
        <pre className="p-4 bg-white border rounded overflow-auto">{e.stack || e.message}</pre>
        <p className="mt-4 text-gray-600">
          Supabaseの環境変数が設定されていない場合に、一部のコンポーネントでエラーが発生することがあります。
          .envファイルを作成後に開発サーバー(npm run dev)を再起動してみてください。
        </p>
      </div>
    );
  }
}