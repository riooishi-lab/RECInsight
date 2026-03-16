import { useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import { BarChart3, Loader2 } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"

type Mode = "signin" | "signup"

export function Login() {
    const { signIn, signUp } = useAuth()
    const [mode, setMode] = useState<Mode>("signin")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")
        setSuccess("")

        if (mode === "signin") {
            const { error } = await signIn(email, password)
            if (error) {
                setError("メールアドレスまたはパスワードが正しくありません")
            }
        } else {
            const { error } = await signUp(email, password)
            if (error) {
                setError(error)
            } else {
                setSuccess("アカウントを作成しました。ログインしました。")
            }
        }
        setLoading(false)
    }

    const toggleMode = () => {
        setMode(m => m === "signin" ? "signup" : "signin")
        setError("")
        setSuccess("")
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <BarChart3 className="h-12 w-12 text-[#0079B3]" />
                    </div>
                    <CardTitle className="text-2xl text-[#0079B3]">採用映像分析</CardTitle>
                    <CardDescription>
                        {mode === "signin"
                            ? "管理者としてログインしてください"
                            : "初回利用時はアカウントを作成してください"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">メールアドレス</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@example.com"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">パスワード</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>
                        )}
                        {success && (
                            <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded">{success}</p>
                        )}
                        <Button
                            type="submit"
                            className="w-full bg-[#0079B3] hover:bg-[#005a86]"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {mode === "signin" ? "ログイン" : "アカウントを作成"}
                        </Button>
                    </form>
                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="text-sm text-[#0079B3] hover:underline"
                        >
                            {mode === "signin"
                                ? "初めて利用する方はこちら（アカウント作成）"
                                : "すでにアカウントをお持ちの方はこちら（ログイン）"}
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
