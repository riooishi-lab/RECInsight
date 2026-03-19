import { useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import { BarChart3, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"

const MASTER_EMAIL = import.meta.env.VITE_MASTER_ADMIN_EMAIL || "rio.oishi@randd-inc.com"

export function MasterLogin({ error: externalError }: { error?: string } = {}) {
    const { signIn, signUp } = useAuth()
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [isFirstTime, setIsFirstTime] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        if (isFirstTime) {
            // 初回：アカウント作成
            const { error } = await signUp(MASTER_EMAIL, password)
            if (error) {
                setError(error)
            }
        } else {
            // 通常ログイン
            const { error } = await signIn(MASTER_EMAIL, password)
            if (error) {
                // 初回未登録の可能性を示す
                setError("パスワードが正しくありません。初回の方は「初回設定」をお試しください。")
            }
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-[#0079B3] flex items-center justify-center">
            <Card className="w-full max-w-sm shadow-xl">
                <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-3">
                        <div className="bg-[#0079B3] rounded-full p-3">
                            <ShieldCheck className="h-8 w-8 text-white" />
                        </div>
                    </div>
                    <CardTitle className="text-xl text-[#0079B3]">マスター管理者ログイン</CardTitle>
                    <CardDescription className="text-xs">R&D 専用管理画面</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    {/* メールアドレス（固定・表示のみ） */}
                    <div className="mb-4 bg-gray-50 rounded-lg px-4 py-3 border">
                        <p className="text-xs text-gray-400 mb-0.5">ログインID</p>
                        <p className="text-sm font-medium text-gray-700">{MASTER_EMAIL}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">
                                {isFirstTime ? "新しいパスワード" : "パスワード"}
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoFocus
                            />
                        </div>
                        {externalError && (
                            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{externalError}</p>
                        )}
                        {error && (
                            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
                        )}
                        <Button
                            type="submit"
                            className="w-full bg-[#0079B3] hover:bg-[#005a86]"
                            disabled={loading}
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {isFirstTime ? "パスワードを設定してログイン" : "ログイン"}
                        </Button>
                    </form>

                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={() => { setIsFirstTime(f => !f); setError("") }}
                            className="text-xs text-gray-400 hover:text-[#0079B3] transition-colors"
                        >
                            {isFirstTime ? "← ログイン画面に戻る" : "初回利用 / パスワード未設定の方はこちら"}
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* フッター */}
            <div className="absolute bottom-6 flex items-center gap-2 text-white/60 text-xs">
                <BarChart3 className="h-4 w-4" />
                採用映像分析ツール
            </div>
        </div>
    )
}
