import { useEffect, useState, useCallback } from "react"
import { supabase } from "../../lib/supabase"
import type { SurveyQuestion, SurveyResponse, SurveyGenre } from "../../lib/supabase"
import { SURVEY_GENRES } from "../../lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Badge } from "./ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "./ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import {
    Plus, Trash2, Loader2, ClipboardList, BarChart3, Filter,
    GripVertical, AlertCircle,
} from "lucide-react"
import { toast } from "sonner"

// ジャンル別カラー
const GENRE_COLORS: Record<SurveyGenre, string> = {
    '目標の魅力': 'bg-[#5CA7D1] text-white',
    '人材の魅力': 'bg-[#7DBDDD] text-white',
    '活動の魅力': 'bg-[#0079B3] text-white',
    '条件の魅力': 'bg-[#4A9B7E] text-white',
}

const GENRE_BAR_COLORS: Record<SurveyGenre, string> = {
    '目標の魅力': '#5CA7D1',
    '人材の魅力': '#7DBDDD',
    '活動の魅力': '#0079B3',
    '条件の魅力': '#4A9B7E',
}

interface QuestionWithStats extends SurveyQuestion {
    responseCount: number
    avgScore: number | null
}

// ─── 設問管理タブ ───
function QuestionsTab({ companyId }: { companyId: string }) {
    const [questions, setQuestions] = useState<SurveyQuestion[]>([])
    const [loading, setLoading] = useState(true)
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const [newText, setNewText] = useState("")
    const [newGenre, setNewGenre] = useState<SurveyGenre | "">("")
    const [adding, setAdding] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const fetchQuestions = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from("survey_questions")
            .select("*")
            .eq("company_id", companyId)
            .order("order_no", { ascending: true })
        if (error) {
            toast.error(`設問の取得に失敗しました: ${error.message}`)
        } else {
            setQuestions(data || [])
        }
        setLoading(false)
    }, [companyId])

    useEffect(() => { fetchQuestions() }, [fetchQuestions])

    const handleAdd = async () => {
        if (!newText.trim() || !newGenre) return
        setAdding(true)
        const maxOrder = questions.length > 0 ? Math.max(...questions.map(q => q.order_no)) + 1 : 0
        const { error } = await supabase.from("survey_questions").insert([{
            company_id: companyId,
            question_text: newText.trim(),
            genre: newGenre,
            order_no: maxOrder,
        }])
        if (error) {
            toast.error(`設問の追加に失敗しました: ${error.message}`)
        } else {
            toast.success("設問を追加しました")
            setNewText("")
            setNewGenre("")
            setAddDialogOpen(false)
            fetchQuestions()
        }
        setAdding(false)
    }

    const handleDelete = async (q: SurveyQuestion) => {
        if (!confirm(`「${q.question_text}」を削除しますか？\n※この設問への回答データも全て削除されます。`)) return
        setDeletingId(q.id)
        const { error } = await supabase.from("survey_questions").delete().eq("id", q.id)
        if (error) {
            toast.error(`削除に失敗しました: ${error.message}`)
        } else {
            toast.success("設問を削除しました")
            fetchQuestions()
        }
        setDeletingId(null)
    }

    return (
        <div className="space-y-4">
            {/* 設問追加ボタン + 設問数 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">設問一覧</h3>
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                        {loading ? "..." : `${questions.length}件`}
                    </Badge>
                </div>
                <Button
                    onClick={() => setAddDialogOpen(true)}
                    className="bg-[#0079B3] hover:bg-[#005a86] gap-2"
                >
                    <Plus className="h-4 w-4" />
                    設問を追加
                </Button>
            </div>

            {loading ? (
                <div className="py-12 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#0079B3]" />
                </div>
            ) : questions.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-12 text-center text-gray-400 space-y-2">
                        <ClipboardList className="h-12 w-12 mx-auto opacity-30" />
                        <p className="font-medium">設問が登録されていません</p>
                        <p className="text-sm">「設問を追加」ボタンから最初の設問を作成してください</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-2">
                    {questions.map((q, idx) => (
                        <Card key={q.id} className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 text-gray-400 shrink-0">
                                        <GripVertical className="h-4 w-4" />
                                        <span className="text-sm font-mono w-6 text-center">{idx + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">{q.question_text}</p>
                                    </div>
                                    <Badge className={`${GENRE_COLORS[q.genre]} text-xs shrink-0`}>
                                        {q.genre}
                                    </Badge>
                                    <button
                                        onClick={() => handleDelete(q)}
                                        disabled={deletingId === q.id}
                                        className="text-gray-400 hover:text-red-500 transition-colors ml-1 shrink-0"
                                    >
                                        {deletingId === q.id
                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                            : <Trash2 className="h-4 w-4" />
                                        }
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* 設問追加ダイアログ */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>設問を追加</DialogTitle>
                        <DialogDescription>
                            回答者（学生）にはジャンルは表示されません
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>設問文</Label>
                            <Input
                                value={newText}
                                onChange={e => setNewText(e.target.value)}
                                placeholder="例：この会社のビジョンに共感できましたか？"
                                onKeyDown={e => { if (e.key === "Enter" && newText.trim() && newGenre) handleAdd() }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>ジャンル</Label>
                            <Select value={newGenre} onValueChange={v => setNewGenre(v as SurveyGenre)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="ジャンルを選択してください" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SURVEY_GENRES.map(g => (
                                        <SelectItem key={g} value={g}>
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-block w-2 h-2 rounded-full`}
                                                    style={{ backgroundColor: GENRE_BAR_COLORS[g] }}
                                                />
                                                {g}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                ジャンルは管理者のみ確認できます。回答者（学生）には表示されません。
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddDialogOpen(false)}>キャンセル</Button>
                        <Button
                            onClick={handleAdd}
                            disabled={adding || !newText.trim() || !newGenre}
                            className="bg-[#0079B3] hover:bg-[#005a86]"
                        >
                            {adding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            追加
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ─── 結果・分析タブ ───
function ResultsTab({ companyId }: { companyId: string }) {
    const [questions, setQuestions] = useState<SurveyQuestion[]>([])
    const [responses, setResponses] = useState<SurveyResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [genreFilter, setGenreFilter] = useState<SurveyGenre | "all">("all")

    const fetchData = useCallback(async () => {
        setLoading(true)
        const [{ data: qs }, { data: rs }] = await Promise.all([
            supabase.from("survey_questions").select("*").eq("company_id", companyId).order("order_no"),
            supabase.from("survey_responses").select("*").eq("company_id", companyId),
        ])
        setQuestions(qs || [])
        setResponses(rs || [])
        setLoading(false)
    }, [companyId])

    useEffect(() => { fetchData() }, [fetchData])

    const getStats = (questionId: string) => {
        const qResponses = responses.filter(r => r.question_id === questionId)
        if (qResponses.length === 0) return { count: 0, avg: null, distribution: [0, 0, 0, 0, 0] }
        const avg = qResponses.reduce((sum, r) => sum + r.score, 0) / qResponses.length
        const distribution = [1, 2, 3, 4, 5].map(s => qResponses.filter(r => r.score === s).length)
        return { count: qResponses.length, avg, distribution }
    }

    const filteredQuestions = genreFilter === "all"
        ? questions
        : questions.filter(q => q.genre === genreFilter)

    // ジャンル別平均スコア
    const genreStats = SURVEY_GENRES.map(genre => {
        const genreQs = questions.filter(q => q.genre === genre)
        const genreResponses = responses.filter(r => genreQs.some(q => q.id === r.question_id))
        const avg = genreResponses.length > 0
            ? genreResponses.reduce((sum, r) => sum + r.score, 0) / genreResponses.length
            : null
        return { genre, avg, count: genreResponses.length, questionCount: genreQs.length }
    })

    if (loading) {
        return (
            <div className="py-12 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#0079B3]" />
            </div>
        )
    }

    if (questions.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-12 text-center text-gray-400 space-y-2">
                    <BarChart3 className="h-12 w-12 mx-auto opacity-30" />
                    <p className="font-medium">設問が登録されていません</p>
                    <p className="text-sm">「設問管理」タブから設問を追加してください</p>
                </CardContent>
            </Card>
        )
    }

    const totalResponses = new Set(responses.map(r => r.student_id)).size

    return (
        <div className="space-y-6">
            {/* サマリーカード */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {genreStats.map(({ genre, avg, count, questionCount }) => (
                    <Card key={genre} className="text-center">
                        <CardContent className="pt-4 pb-4">
                            <div
                                className="text-2xl font-bold"
                                style={{ color: GENRE_BAR_COLORS[genre] }}
                            >
                                {avg !== null ? avg.toFixed(2) : "—"}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{genre}</div>
                            <div className="text-xs text-gray-400">{questionCount}問 / {count}回答</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ジャンル別棒グラフ */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">ジャンル別平均スコア（5点満点）</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {genreStats.map(({ genre, avg }) => (
                        <div key={genre} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{genre}</span>
                                <span className="text-gray-600 font-mono">
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
                </CardContent>
            </Card>

            {/* フィルター + 設問別結果 */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">ジャンルフィルター：</span>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setGenreFilter("all")}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${genreFilter === "all"
                                ? "bg-[#0079B3] text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            すべて（{questions.length}問）
                        </button>
                        {SURVEY_GENRES.map(g => {
                            const count = questions.filter(q => q.genre === g).length
                            return (
                                <button
                                    key={g}
                                    onClick={() => setGenreFilter(g)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${genreFilter === g
                                        ? "text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                    style={genreFilter === g ? { backgroundColor: GENRE_BAR_COLORS[g] } : {}}
                                >
                                    {g}（{count}問）
                                </button>
                            )
                        })}
                    </div>
                    <div className="ml-auto text-sm text-gray-500">
                        回答者数：<span className="font-medium text-gray-900">{totalResponses}名</span>
                    </div>
                </div>

                {filteredQuestions.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">このジャンルの設問はありません</p>
                ) : (
                    <div className="space-y-3">
                        {filteredQuestions.map((q, idx) => {
                            const { count, avg, distribution } = getStats(q.id)
                            const maxDist = Math.max(...distribution, 1)
                            return (
                                <Card key={q.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <span className="text-sm text-gray-400 font-mono shrink-0 mt-0.5">
                                                Q{idx + 1}
                                            </span>
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-sm font-medium">{q.question_text}</p>
                                                    <Badge className={`${GENRE_COLORS[q.genre]} text-xs shrink-0`}>
                                                        {q.genre}
                                                    </Badge>
                                                </div>
                                                {count === 0 ? (
                                                    <p className="text-xs text-gray-400">まだ回答がありません</p>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-3">
                                                            <span
                                                                className="text-2xl font-bold"
                                                                style={{ color: GENRE_BAR_COLORS[q.genre] }}
                                                            >
                                                                {avg!.toFixed(2)}
                                                            </span>
                                                            <span className="text-sm text-gray-500">/ 5.00</span>
                                                            <span className="text-xs text-gray-400 ml-2">
                                                                （{count}件の回答）
                                                            </span>
                                                        </div>
                                                        {/* 分布バー */}
                                                        <div className="space-y-1">
                                                            {[5, 4, 3, 2, 1].map(score => (
                                                                <div key={score} className="flex items-center gap-2">
                                                                    <span className="text-xs text-gray-500 w-4 text-right">{score}</span>
                                                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full rounded-full transition-all duration-500"
                                                                            style={{
                                                                                width: `${(distribution[score - 1] / maxDist) * 100}%`,
                                                                                backgroundColor: GENRE_BAR_COLORS[q.genre],
                                                                                opacity: 0.4 + (score / 5) * 0.6,
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-xs text-gray-400 w-6">
                                                                        {distribution[score - 1]}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── メインコンポーネント ───
export function SurveyManagement({ companyId }: { companyId: string }) {
    const [questionCount, setQuestionCount] = useState<number | null>(null)

    useEffect(() => {
        supabase
            .from("survey_questions")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .then(({ count }) => setQuestionCount(count ?? 0))
    }, [companyId])

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold">サーベイ管理</h2>
                <p className="text-gray-500 mt-1">学生アンケートの設問管理と回答結果の分析</p>
            </div>

            <Tabs defaultValue="questions">
                <TabsList>
                    <TabsTrigger value="questions" className="gap-2">
                        <ClipboardList className="h-4 w-4" />
                        設問管理
                        {questionCount !== null && (
                            <Badge variant="secondary" className="ml-1 text-xs">
                                {questionCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="results" className="gap-2">
                        <BarChart3 className="h-4 w-4" />
                        結果・分析
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="questions" className="mt-4">
                    <QuestionsTab
                        companyId={companyId}
                        key={companyId}
                    />
                </TabsContent>

                <TabsContent value="results" className="mt-4">
                    <ResultsTab companyId={companyId} key={companyId} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
