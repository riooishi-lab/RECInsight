import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import type { Company, AdminUser, SurveyQuestion, SurveyResponse, SurveyGenre } from "../../lib/supabase"
import { SURVEY_GENRES } from "../../lib/supabase"
import { useAuth } from "../contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Badge } from "./ui/badge"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "./ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import {
    BarChart3, Building2, Plus, LogOut, Users, Eye, Loader2,
    Settings, Trash2, Mail, ExternalLink, Copy, Check,
    ClipboardList, BarChart2, ChevronRight, ArrowLeft, Filter,
} from "lucide-react"
import { toast } from "sonner"

interface CompanyWithAdmins extends Company {
    admins: AdminUser[]
}

interface MasterDashboardProps {
    onSelectCompany: (companyId: string, companyName: string) => void
}

// ─── ジャンル別カラー ───
const GENRE_BAR_COLORS: Record<SurveyGenre, string> = {
    '目標の魅力': '#5CA7D1',
    '人材の魅力': '#7DBDDD',
    '活動の魅力': '#0079B3',
    '条件の魅力': '#4A9B7E',
}

const GENRE_BADGE_COLORS: Record<SurveyGenre, string> = {
    '目標の魅力': 'bg-[#5CA7D1] text-white',
    '人材の魅力': 'bg-[#7DBDDD] text-white',
    '活動の魅力': 'bg-[#0079B3] text-white',
    '条件の魅力': 'bg-[#4A9B7E] text-white',
}

// ─── 企業詳細パネル ───
function CompanyDetailPanel({
    company,
    onClose,
    onOpenDashboard,
}: {
    company: CompanyWithAdmins
    onClose: () => void
    onOpenDashboard: () => void
}) {
    const [questions, setQuestions] = useState<SurveyQuestion[]>([])
    const [responses, setResponses] = useState<SurveyResponse[]>([])
    const [surveyLoading, setSurveyLoading] = useState(true)
    const [genreFilter, setGenreFilter] = useState<SurveyGenre | "all">("all")

    useEffect(() => {
        const load = async () => {
            setSurveyLoading(true)
            const [{ data: qs }, { data: rs }] = await Promise.all([
                supabase.from("survey_questions").select("*").eq("company_id", company.id).order("order_no"),
                supabase.from("survey_responses").select("*").eq("company_id", company.id),
            ])
            setQuestions(qs || [])
            setResponses(rs || [])
            setSurveyLoading(false)
        }
        load()
    }, [company.id])

    const getStats = (questionId: string) => {
        const qr = responses.filter(r => r.question_id === questionId)
        if (qr.length === 0) return { count: 0, avg: null }
        return { count: qr.length, avg: qr.reduce((s, r) => s + r.score, 0) / qr.length }
    }

    const genreStats = SURVEY_GENRES.map(genre => {
        const genreQs = questions.filter(q => q.genre === genre)
        const genreRs = responses.filter(r => genreQs.some(q => q.id === r.question_id))
        const avg = genreRs.length > 0 ? genreRs.reduce((s, r) => s + r.score, 0) / genreRs.length : null
        return { genre, avg, count: genreRs.length, questionCount: genreQs.length }
    })

    const filteredQuestions = genreFilter === "all"
        ? questions
        : questions.filter(q => q.genre === genreFilter)

    const totalRespondents = new Set(responses.map(r => r.student_id)).size

    return (
        <div className="space-y-6">
            {/* ヘッダー */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#0079B3] transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        企業一覧に戻る
                    </button>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-[#0079B3]" />
                        {company.name}
                    </h2>
                </div>
                <Button
                    onClick={onOpenDashboard}
                    className="bg-[#0079B3] hover:bg-[#005a86] gap-2"
                >
                    <Eye className="h-4 w-4" />
                    ダッシュボードを開く
                </Button>
            </div>

            {/* 企業情報カード */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-4 pb-4 text-center">
                        <div className="text-2xl font-bold text-[#0079B3]">{company.admins.length}</div>
                        <div className="text-xs text-gray-500 mt-1">管理者数</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-4 text-center">
                        <div className="text-2xl font-bold text-[#0079B3]">{questions.length}</div>
                        <div className="text-xs text-gray-500 mt-1">サーベイ設問数</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-4 text-center">
                        <div className="text-2xl font-bold text-[#0079B3]">{totalRespondents}</div>
                        <div className="text-xs text-gray-500 mt-1">回答者数</div>
                    </CardContent>
                </Card>
            </div>

            {/* 管理者一覧 */}
            {company.admins.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            管理者アカウント
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        {company.admins.map(admin => (
                            <div key={admin.id} className="flex items-center gap-2 text-sm text-gray-600 py-1">
                                <Mail className="h-3 w-3 text-gray-400" />
                                {admin.email}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* サーベイ結果 */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ClipboardList className="h-4 w-4 text-[#0079B3]" />
                        サーベイ結果
                    </CardTitle>
                    <CardDescription>
                        登録企業のアンケート集計 ・ 回答者数: {totalRespondents}名
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {surveyLoading ? (
                        <div className="py-8 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-[#0079B3]" />
                        </div>
                    ) : questions.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 space-y-2">
                            <ClipboardList className="h-8 w-8 mx-auto opacity-30" />
                            <p className="text-sm">設問が登録されていません</p>
                        </div>
                    ) : (
                        <Tabs defaultValue="summary">
                            <TabsList>
                                <TabsTrigger value="summary" className="gap-1.5">
                                    <BarChart2 className="h-3.5 w-3.5" />
                                    ジャンル別サマリー
                                </TabsTrigger>
                                <TabsTrigger value="detail" className="gap-1.5">
                                    <ClipboardList className="h-3.5 w-3.5" />
                                    設問別詳細
                                </TabsTrigger>
                            </TabsList>

                            {/* ジャンル別サマリー */}
                            <TabsContent value="summary" className="mt-4 space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {genreStats.map(({ genre, avg, count, questionCount }) => (
                                        <Card key={genre} className="text-center border-2"
                                            style={{ borderColor: avg ? GENRE_BAR_COLORS[genre] + "40" : undefined }}>
                                            <CardContent className="pt-3 pb-3">
                                                <div className="text-xl font-bold"
                                                    style={{ color: GENRE_BAR_COLORS[genre] }}>
                                                    {avg !== null ? avg.toFixed(2) : "—"}
                                                </div>
                                                <div className="text-xs font-medium text-gray-700 mt-1">{genre}</div>
                                                <div className="text-xs text-gray-400">{questionCount}問 / {count}回答</div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                <div className="space-y-3">
                                    {genreStats.map(({ genre, avg }) => (
                                        <div key={genre} className="space-y-1">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-medium">{genre}</span>
                                                <span className="text-gray-600 font-mono text-xs">
                                                    {avg !== null ? `${avg.toFixed(2)} / 5.00` : "回答なし"}
                                                </span>
                                            </div>
                                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: avg !== null ? `${(avg / 5) * 100}%` : "0%",
                                                        backgroundColor: GENRE_BAR_COLORS[genre],
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            {/* 設問別詳細 */}
                            <TabsContent value="detail" className="mt-4 space-y-4">
                                {/* ジャンルフィルター */}
                                <div className="flex items-center flex-wrap gap-2">
                                    <Filter className="h-3.5 w-3.5 text-gray-500" />
                                    <button
                                        onClick={() => setGenreFilter("all")}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${genreFilter === "all"
                                            ? "bg-[#0079B3] text-white"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                    >
                                        すべて
                                    </button>
                                    {SURVEY_GENRES.map(g => (
                                        <button
                                            key={g}
                                            onClick={() => setGenreFilter(g)}
                                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${genreFilter === g
                                                ? "text-white"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                }`}
                                            style={genreFilter === g ? { backgroundColor: GENRE_BAR_COLORS[g] } : {}}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>

                                {filteredQuestions.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-4">このジャンルの設問はありません</p>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredQuestions.map((q, idx) => {
                                            const { count, avg } = getStats(q.id)
                                            return (
                                                <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50 text-sm">
                                                    <span className="text-gray-400 font-mono text-xs w-6 shrink-0">Q{idx + 1}</span>
                                                    <p className="flex-1 text-gray-800">{q.question_text}</p>
                                                    <Badge className={`${GENRE_BADGE_COLORS[q.genre]} text-xs shrink-0`}>
                                                        {q.genre}
                                                    </Badge>
                                                    <div className="shrink-0 text-right min-w-[60px]">
                                                        {count === 0 ? (
                                                            <span className="text-gray-400 text-xs">未回答</span>
                                                        ) : (
                                                            <>
                                                                <div className="font-bold" style={{ color: GENRE_BAR_COLORS[q.genre] }}>
                                                                    {avg!.toFixed(2)}
                                                                </div>
                                                                <div className="text-xs text-gray-400">{count}件</div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export function MasterDashboard({ onSelectCompany }: MasterDashboardProps) {
    const { adminUser, signOut } = useAuth()
    const [companies, setCompanies] = useState<CompanyWithAdmins[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedCompany, setSelectedCompany] = useState<CompanyWithAdmins | null>(null)

    // 企業追加ダイアログ
    const [addCompanyOpen, setAddCompanyOpen] = useState(false)
    const [newCompanyName, setNewCompanyName] = useState("")
    const [addingCompany, setAddingCompany] = useState(false)

    // 管理者追加ダイアログ
    const [addAdminOpen, setAddAdminOpen] = useState(false)
    const [selectedCompanyForAdmin, setSelectedCompanyForAdmin] = useState<Company | null>(null)
    const [newAdminEmail, setNewAdminEmail] = useState("")
    const [newAdminPassword, setNewAdminPassword] = useState("")
    const [addingAdmin, setAddingAdmin] = useState(false)
    const [copied, setCopied] = useState(false)

    const companyLoginUrl = window.location.origin + "/"

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(companyLoginUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const fetchCompanies = async () => {
        setLoading(true)
        const { data: companiesData } = await supabase
            .from("companies")
            .select("*")
            .order("created_at", { ascending: false })

        if (companiesData) {
            const { data: adminsData } = await supabase
                .from("admin_users")
                .select("*")
                .eq("role", "company")

            const withAdmins: CompanyWithAdmins[] = companiesData.map((c) => ({
                ...c,
                admins: (adminsData || []).filter((a) => a.company_id === c.id),
            }))
            setCompanies(withAdmins)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchCompanies()
    }, [])

    const handleAddCompany = async () => {
        if (!newCompanyName.trim()) return
        setAddingCompany(true)
        const { error } = await supabase
            .from("companies")
            .insert([{ name: newCompanyName.trim() }])
        if (error) {
            toast.error(`企業追加エラー: ${error.message}`)
        } else {
            toast.success("企業を追加しました")
            setNewCompanyName("")
            setAddCompanyOpen(false)
            fetchCompanies()
        }
        setAddingCompany(false)
    }

    const handleDeleteCompany = async (company: Company) => {
        if (!confirm(`「${company.name}」を削除しますか？\n※関連する全てのデータ（学生・動画・視聴履歴）も削除されます`)) return
        const { error } = await supabase.from("companies").delete().eq("id", company.id)
        if (error) {
            toast.error(`削除エラー: ${error.message}`)
        } else {
            toast.success("企業を削除しました")
            if (selectedCompany?.id === company.id) setSelectedCompany(null)
            fetchCompanies()
        }
    }

    const handleAddAdmin = async () => {
        if (!selectedCompanyForAdmin || !newAdminEmail.trim() || !newAdminPassword.trim()) return
        setAddingAdmin(true)
        try {
            const { error: authError } = await supabase.auth.signUp({
                email: newAdminEmail.trim(),
                password: newAdminPassword.trim(),
            })
            if (authError && !authError.message.includes('already registered')) {
                toast.error(`認証エラー: ${authError.message}`)
                setAddingAdmin(false)
                return
            }

            const { error: dbError } = await supabase
                .from("admin_users")
                .upsert([{
                    email: newAdminEmail.trim(),
                    role: "company",
                    company_id: selectedCompanyForAdmin.id,
                }], { onConflict: "email" })

            if (dbError) {
                toast.error(`管理者追加エラー: ${dbError.message}`)
            } else {
                toast.success(`${selectedCompanyForAdmin.name}の管理者を追加しました`)
                setNewAdminEmail("")
                setNewAdminPassword("")
                setAddAdminOpen(false)
                fetchCompanies()
            }
        } finally {
            setAddingAdmin(false)
        }
    }

    const handleDeleteAdmin = async (admin: AdminUser) => {
        if (!confirm(`「${admin.email}」の管理者権限を削除しますか？`)) return
        const { error } = await supabase.from("admin_users").delete().eq("id", admin.id)
        if (error) {
            toast.error(`削除エラー: ${error.message}`)
        } else {
            toast.success("管理者を削除しました")
            fetchCompanies()
        }
    }

    // 企業詳細パネルを表示中
    if (selectedCompany) {
        return (
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white border-b px-8 py-4">
                    <div className="max-w-6xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="h-8 w-8 text-[#0079B3]" />
                            <div>
                                <h1 className="font-bold text-[#0079B3] text-lg">採用映像分析 - マスター管理</h1>
                                <p className="text-xs text-gray-500">{adminUser?.email}</p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={signOut} className="gap-2">
                            <LogOut className="h-4 w-4" />
                            ログアウト
                        </Button>
                    </div>
                </header>
                <main className="max-w-6xl mx-auto px-8 py-8">
                    <CompanyDetailPanel
                        company={selectedCompany}
                        onClose={() => setSelectedCompany(null)}
                        onOpenDashboard={() => onSelectCompany(selectedCompany.id, selectedCompany.name)}
                    />
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ヘッダー */}
            <header className="bg-white border-b px-8 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="h-8 w-8 text-[#0079B3]" />
                        <div>
                            <h1 className="font-bold text-[#0079B3] text-lg">採用映像分析 - マスター管理</h1>
                            <p className="text-xs text-gray-500">{adminUser?.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* 企業ログインURLバナー */}
                        <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
                            <span className="text-xs text-gray-500">企業ログインURL：</span>
                            <span className="text-xs font-mono text-gray-700">{companyLoginUrl}</span>
                            <button
                                onClick={handleCopyUrl}
                                className="text-gray-400 hover:text-[#0079B3] transition-colors"
                                title="URLをコピー"
                            >
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </button>
                            <a
                                href={companyLoginUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-[#0079B3] transition-colors"
                                title="企業ログインページを開く"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </div>
                        <Button variant="outline" onClick={signOut} className="gap-2">
                            <LogOut className="h-4 w-4" />
                            ログアウト
                        </Button>
                    </div>
                </div>
            </header>

            {/* メインコンテンツ */}
            <main className="max-w-6xl mx-auto px-8 py-8 space-y-8">
                {/* ─── 企業管理ヘッダー ─── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">企業管理</h2>
                        <p className="text-gray-500 text-sm mt-1">登録企業の管理と各企業ダッシュボードへのアクセス</p>
                    </div>
                    <Button
                        onClick={() => setAddCompanyOpen(true)}
                        className="bg-[#0079B3] hover:bg-[#005a86] gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        企業を追加
                    </Button>
                </div>

                {/* ─── 最近の企業（上位3件）─── */}
                {!loading && companies.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">最近の企業</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {companies.slice(0, 3).map(company => (
                                <button
                                    key={company.id}
                                    onClick={() => setSelectedCompany(company)}
                                    className="flex items-center gap-3 p-4 bg-white rounded-xl border hover:border-[#0079B3] hover:shadow-md transition-all text-left group"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-[#E1F1F9] flex items-center justify-center shrink-0">
                                        <Building2 className="h-5 w-5 text-[#0079B3]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm truncate group-hover:text-[#0079B3] transition-colors">
                                            {company.name}
                                        </p>
                                        <p className="text-xs text-gray-400">管理者 {company.admins.length}名</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-[#0079B3] shrink-0 transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ─── 全企業一覧 ─── */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-[#0079B3]" />
                    </div>
                ) : companies.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-gray-500">
                            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>企業が登録されていません</p>
                            <p className="text-sm mt-1">「企業を追加」ボタンから最初の企業を登録してください</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                            全企業一覧 ({companies.length}社)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {companies.map((company) => (
                                <Card
                                    key={company.id}
                                    className="hover:shadow-md transition-shadow cursor-pointer hover:border-[#0079B3]/40"
                                    onClick={() => setSelectedCompany(company)}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-5 w-5 text-[#0079B3]" />
                                                <CardTitle className="text-base">{company.name}</CardTitle>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeleteCompany(company)
                                                }}
                                                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <CardDescription>
                                            <div className="flex items-center gap-1 text-xs">
                                                <Users className="h-3 w-3" />
                                                管理者 {company.admins.length}名
                                            </div>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {/* 管理者リスト */}
                                        {company.admins.length > 0 && (
                                            <div className="space-y-1">
                                                {company.admins.map((admin) => (
                                                    <div key={admin.id} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                                                        <div className="flex items-center gap-1 text-gray-600 truncate">
                                                            <Mail className="h-3 w-3 flex-shrink-0" />
                                                            <span className="truncate">{admin.email}</span>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDeleteAdmin(admin)
                                                            }}
                                                            className="text-gray-400 hover:text-red-500 ml-1 flex-shrink-0"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                className="flex-1 bg-[#0079B3] hover:bg-[#005a86] gap-1"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onSelectCompany(company.id, company.name)
                                                }}
                                            >
                                                <Eye className="h-3 w-3" />
                                                ダッシュボード
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="gap-1"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedCompanyForAdmin(company)
                                                    setAddAdminOpen(true)
                                                }}
                                            >
                                                <Settings className="h-3 w-3" />
                                                管理者追加
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* 企業追加ダイアログ */}
            <Dialog open={addCompanyOpen} onOpenChange={setAddCompanyOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>企業を追加</DialogTitle>
                        <DialogDescription>新しい企業を登録します</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>企業名</Label>
                            <Input
                                value={newCompanyName}
                                onChange={(e) => setNewCompanyName(e.target.value)}
                                placeholder="株式会社〇〇"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddCompanyOpen(false)}>キャンセル</Button>
                        <Button
                            onClick={handleAddCompany}
                            disabled={addingCompany || !newCompanyName.trim()}
                            className="bg-[#0079B3] hover:bg-[#005a86]"
                        >
                            {addingCompany && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            追加
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 管理者追加ダイアログ */}
            <Dialog open={addAdminOpen} onOpenChange={setAddAdminOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedCompanyForAdmin?.name} - 管理者を追加</DialogTitle>
                        <DialogDescription>企業の管理者アカウントを新規作成します</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>メールアドレス</Label>
                            <Input
                                type="email"
                                value={newAdminEmail}
                                onChange={(e) => setNewAdminEmail(e.target.value)}
                                placeholder="admin@company.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>パスワード（初期）</Label>
                            <Input
                                type="password"
                                value={newAdminPassword}
                                onChange={(e) => setNewAdminPassword(e.target.value)}
                                placeholder="8文字以上"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddAdminOpen(false)}>キャンセル</Button>
                        <Button
                            onClick={handleAddAdmin}
                            disabled={addingAdmin || !newAdminEmail.trim() || !newAdminPassword.trim()}
                            className="bg-[#0079B3] hover:bg-[#005a86]"
                        >
                            {addingAdmin && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            追加
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
