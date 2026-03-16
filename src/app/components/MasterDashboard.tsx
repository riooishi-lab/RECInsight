import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import type { Company, AdminUser } from "../../lib/supabase"
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
import {
    BarChart3, Building2, Plus, LogOut, Users, Eye, Loader2,
    Settings, Trash2, Mail, ExternalLink, Copy, Check,
} from "lucide-react"
import { toast } from "sonner"

interface CompanyWithAdmins extends Company {
    admins: AdminUser[]
}

interface MasterDashboardProps {
    onSelectCompany: (companyId: string, companyName: string) => void
}

export function MasterDashboard({ onSelectCompany }: MasterDashboardProps) {
    const { adminUser, signOut } = useAuth()
    const [companies, setCompanies] = useState<CompanyWithAdmins[]>([])
    const [loading, setLoading] = useState(true)

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
            .order("created_at", { ascending: true })

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
            fetchCompanies()
        }
    }

    const handleAddAdmin = async () => {
        if (!selectedCompanyForAdmin || !newAdminEmail.trim() || !newAdminPassword.trim()) return
        setAddingAdmin(true)
        try {
            // Supabase Authにユーザー作成（管理者APIが必要なためinviteUserByEmailを使用）
            const { error: authError } = await supabase.auth.signUp({
                email: newAdminEmail.trim(),
                password: newAdminPassword.trim(),
            })
            if (authError && !authError.message.includes('already registered')) {
                toast.error(`認証エラー: ${authError.message}`)
                setAddingAdmin(false)
                return
            }

            // admin_usersテーブルに登録
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
            <main className="max-w-6xl mx-auto px-8 py-8 space-y-6">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {companies.map((company) => (
                            <Card key={company.id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-5 w-5 text-[#0079B3]" />
                                            <CardTitle className="text-base">{company.name}</CardTitle>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteCompany(company)}
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
                                                        onClick={() => handleDeleteAdmin(admin)}
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
                                            onClick={() => onSelectCompany(company.id, company.name)}
                                        >
                                            <Eye className="h-3 w-3" />
                                            ダッシュボードを開く
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-1"
                                            onClick={() => {
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
