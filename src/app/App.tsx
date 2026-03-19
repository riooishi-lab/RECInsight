import { useState, useEffect } from "react";
import { Overview } from "./components/Overview";
import { PhaseDetail } from "./components/PhaseDetail";
import { VideoAnalytics } from "./components/VideoAnalytics";
import { ContentManagement } from "./components/ContentManagement";
import { StudentManagement } from "./components/StudentManagement";
import { StudentPortal } from "./components/StudentPortal";
import { StepManagement } from "./components/StepManagement";
import { Manual } from "./components/Manual";
import { Login } from "./components/Login";
import { MasterLogin } from "./components/MasterLogin";
import { MasterDashboard } from "./components/MasterDashboard";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BarChart3, Home, TrendingUp, FolderOpen, Users, GraduationCap, Book, Layers, LogOut, ChevronLeft, Building2 } from "lucide-react";
import { Toaster } from "sonner";

type View = "overview" | "phases" | "contents" | "content" | "steps" | "students" | "manual";

const VALID_VIEWS: View[] = ["overview", "phases", "contents", "content", "steps", "students", "manual"];

function getInitialView(): View {
  const hash = window.location.hash.replace("#", "") as View;
  return VALID_VIEWS.includes(hash) ? hash : "overview";
}

// 企業ダッシュボード（既存の管理画面 + companyId）
function CompanyDashboard({
  companyId,
  companyName,
  onBack,
}: {
  companyId: string;
  companyName: string;
  onBack?: () => void;
}) {
  const { adminUser, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<View>(getInitialView);

  function navigate(view: View) {
    setCurrentView(view);
    window.location.hash = view;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 左サイドバー */}
      <aside className="w-64 bg-white border-r min-h-screen fixed left-0 top-0">
        {/* ヘッダー */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-[#0079B3]" />
            <div className="flex-1 text-left min-w-0">
              <h1 className="font-bold text-[#0079B3] truncate">採用映像分析</h1>
              <p className="text-xs text-gray-500 truncate">{companyName}</p>
            </div>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-3 flex items-center gap-1 text-xs text-gray-500 hover:text-[#0079B3] transition-colors"
            >
              <ChevronLeft className="h-3 w-3" />
              企業一覧に戻る
            </button>
          )}
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

        {/* ログアウト */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="text-xs text-gray-400 truncate mb-2">{adminUser?.email}</div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            ログアウト
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 ml-64">
        <div className="container mx-auto px-8 py-8">
          {currentView === "overview" && <Overview companyId={companyId} />}
          {currentView === "phases" && <PhaseDetail companyId={companyId} />}
          {currentView === "contents" && <VideoAnalytics companyId={companyId} />}
          {currentView === "content" && <ContentManagement companyId={companyId} />}
          {currentView === "steps" && <StepManagement companyId={companyId} />}
          {currentView === "students" && <StudentManagement companyId={companyId} />}
          {currentView === "manual" && <Manual />}
        </div>

        <footer className="bg-white border-t mt-12">
          <div className="container mx-auto px-8 py-4 text-center text-sm text-gray-500">
            © 2026 採用映像分析ツール - 学生の行動を理解し、より良い採用体験を
          </div>
        </footer>
      </main>
    </div>
  );
}

// ─── マスターフロー（/master パス）───
function MasterApp() {
  const { adminUser, loading, signOut } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>("");
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && adminUser && adminUser.role !== "master") {
      // master 以外のロールでログインした場合は即座にサインアウトしてエラーを表示
      signOut();
      setRoleError(
        `このアカウント（${adminUser.email}）にはマスター管理者の権限がありません。` +
        "管理者にお問い合わせください。"
      );
    }
  }, [loading, adminUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0079B3] flex items-center justify-center">
        <div className="text-white/70">読み込み中...</div>
      </div>
    );
  }

  // 未ログイン（またはロールエラーでサインアウト済み）→ マスター専用ログイン画面
  if (!adminUser) {
    return <MasterLogin error={roleError ?? undefined} />;
  }

  // 企業ダッシュボードを選択中
  if (selectedCompanyId) {
    return (
      <CompanyDashboard
        companyId={selectedCompanyId}
        companyName={selectedCompanyName}
        onBack={() => {
          setSelectedCompanyId(null);
          setSelectedCompanyName("");
        }}
      />
    );
  }

  // マスターダッシュボード（企業一覧）
  return (
    <MasterDashboard
      onSelectCompany={(id, name) => {
        setSelectedCompanyId(id);
        setSelectedCompanyName(name);
      }}
    />
  );
}

// ─── 企業管理者フロー（通常パス）───
function CompanyApp() {
  const { adminUser, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  // 未ログイン → 企業ログイン画面
  if (!adminUser) {
    return <Login />;
  }

  // 企業管理者 → 自社ダッシュボード
  if (adminUser.role === "company" && adminUser.company_id) {
    return (
      <CompanyDashboard
        companyId={adminUser.company_id}
        companyName={adminUser.company?.name || ""}
      />
    );
  }

  // マスターが通常URLにアクセスした場合はサインアウトを促す
  if (adminUser.role === "master") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500 space-y-4">
          <Building2 className="h-12 w-12 mx-auto text-gray-300" />
          <p>マスター管理者としてログイン中です。</p>
          <p className="text-sm text-gray-400">企業としてログインするにはサインアウトしてください。</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.replace("/master")}
              className="px-4 py-2 text-sm bg-[#0079B3] text-white rounded-lg hover:bg-[#005a86] transition-colors"
            >
              マスター画面に戻る
            </button>
            <button
              onClick={async () => {
                await signOut();
                window.location.reload();
              }}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              サインアウト
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center text-gray-500">
        <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>アカウントに企業が紐付けられていません。管理者にお問い合わせください。</p>
      </div>
    </div>
  );
}

export default function App() {
  const pathname = window.location.pathname;

  // /watch → 学生ポータル（認証不要）
  if (pathname === "/watch") {
    return (
      <ErrorBoundary fallbackMessage="ポータルの読み込みに失敗しました">
        <StudentPortal />
        <Toaster richColors position="top-right" />
      </ErrorBoundary>
    );
  }

  // /master → マスター管理者フロー
  if (pathname === "/master" || pathname.startsWith("/master/")) {
    return (
      <ErrorBoundary fallbackMessage="管理画面の読み込みに失敗しました">
        <Toaster richColors position="top-right" />
        <AuthProvider>
          <MasterApp />
        </AuthProvider>
      </ErrorBoundary>
    );
  }

  // それ以外 → 企業管理者フロー
  return (
    <ErrorBoundary fallbackMessage="管理画面の読み込みに失敗しました">
      <Toaster richColors position="top-right" />
      <AuthProvider>
        <CompanyApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
