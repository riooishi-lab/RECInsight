// 動画データ
export interface Video {
  id: string;
  title: string;
  description: string; // 動画の概要
  category: string;
  subcategory: string;
  duration: number; // 動画の長さ（秒）
  availablePhases: StepId[]; // この動画が公開されるステップ
}

// パンフレットデータ
export interface Brochure {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  pages: number;
  category: string;
}

// 記事データ
export interface Article {
  id: string;
  title: string;
  excerpt: string;
  thumbnail: string;
  date: string;
  readTime: number;
  category: string;
}

export const videos: Video[] = [
  // STEP1：認知・エントリー期（認知・興味フェーズで公開）
  {
    id: "v1",
    title: "会社紹介",
    description: "会社の成り立ちや事業内容をわかりやすく紹介します",
    category: "目標の魅力",
    subcategory: "会社基盤",
    duration: 300,
    availablePhases: ["STEP1", "STEP2", "STEP3"]
  },
  {
    id: "v2",
    title: "数字で見る自社",
    description: "財務状況や事業規模など、数字で見る企業の実力を紹介",
    category: "目標の魅力",
    subcategory: "会社基盤",
    duration: 280,
    availablePhases: ["STEP1", "STEP2", "STEP3"]
  },
  {
    id: "v5",
    title: "同期座談会（開放的風土）",
    description: "オープンで風通しの良い職場環境を同期社員が語ります",
    category: "人材の魅力",
    subcategory: "組織風土",
    duration: 310,
    availablePhases: ["STEP1", "STEP2", "STEP3"]
  },
  {
    id: "v16",
    title: "オフィスルームツアー",
    description: "実際のオフィス環境や施設、設備を動画で紹介",
    category: "条件の魅力",
    subcategory: "仕事環境",
    duration: 295,
    availablePhases: ["STEP1", "STEP2", "STEP3"]
  },

  // STEP2
  {
    id: "v9",
    title: "同期座談会（社会的意義）",
    description: "事業を通じて社会に与える価値や影響を同期社員が語ります",
    category: "活動の魅力",
    subcategory: "事業内容",
    duration: 325,
    availablePhases: ["STEP2", "STEP3"]
  },
  {
    id: "v10",
    title: "自社のこだわり",
    description: "競合との違いや独自の強み、こだわりのポイントを紹介",
    category: "活動の魅力",
    subcategory: "事業内容",
    duration: 300,
    availablePhases: ["STEP2", "STEP3"]
  },
  {
    id: "v11",
    title: "若手やりがい一問一答",
    description: "若手社員が感じるやりがいや達成感を一問一答形式で紹介",
    category: "活動の魅力",
    subcategory: "仕事内容",
    duration: 285,
    availablePhases: ["STEP2", "STEP3"]
  },
  {
    id: "v12",
    title: "ビフォーアフター",
    description: "入社前後での成長や変化、キャリアの変遷を紹介",
    category: "活動の魅力",
    subcategory: "仕事内容",
    duration: 310,
    availablePhases: ["STEP2", "STEP3"]
  },
  {
    id: "v3",
    title: "社長インタビュー（企業理念編）",
    description: "社長が語る企業理念やビジョン、大切にしている価値観",
    category: "目標の魅力",
    subcategory: "理念戦略",
    duration: 320,
    availablePhases: ["STEP2", "STEP3"]
  },
  {
    id: "v7",
    title: "先輩1日密着",
    description: "先輩社員の1日に密着し、リアルな仕事の様子を紹介",
    category: "人材の魅力",
    subcategory: "人的魅力",
    duration: 305,
    availablePhases: ["STEP2", "STEP3"]
  },
  {
    id: "v8",
    title: "先輩後輩対談",
    description: "先輩と後輩の対談を通じて、成長とサポート体制を紹介",
    category: "人材の魅力",
    subcategory: "人的魅力",
    duration: 315,
    availablePhases: ["STEP2", "STEP3"]
  },
  {
    id: "v6",
    title: "新規プロジェクト紹介",
    description: "若手が提案した新規プロジェクトの実現事例を紹介",
    category: "人材の魅力",
    subcategory: "組織風土",
    duration: 295,
    availablePhases: ["STEP2", "STEP3"]
  },

  // STEP3
  {
    id: "v4",
    title: "社長インタビュー（今後の展望編）",
    description: "社長が語る中長期的な経営戦略と実現したい未来",
    category: "目標の魅力",
    subcategory: "理念戦略",
    duration: 290,
    availablePhases: ["STEP3"]
  },
  {
    id: "v15",
    title: "休日の過ごし方",
    description: "社員のプライベートや休日の過ごし方を紹介",
    category: "条件の魅力",
    subcategory: "仕事環境",
    duration: 305,
    availablePhases: ["STEP3"]
  },
  {
    id: "v14",
    title: "ありがとうリレー",
    description: "社員同士の感謝の気持ちをリレー形式で紹介",
    category: "条件の魅力",
    subcategory: "報酬体系",
    duration: 280,
    availablePhases: ["STEP3"]
  },
  {
    id: "v13",
    title: "働き方制度の活用事例",
    description: "実際に働き方制度を活用している社員の事例を紹介",
    category: "条件の魅力",
    subcategory: "報酬体系",
    duration: 290,
    availablePhases: ["STEP3"]
  },
];

// フェーズデータ
export type Phase = "認知" | "興味" | "応募" | "選定" | "内定" | "承諾";
export const phases: Phase[] = ["認知", "興味", "応募", "選定", "内定", "承諾"];

export type StepId = "STEP1" | "STEP2" | "STEP3";
export const stepIds: StepId[] = ["STEP1", "STEP2", "STEP3"];

// フェーズからステップへのマッピング
export const phaseToStep: Record<Phase, StepId> = {
  "認知": "STEP1",
  "興味": "STEP1",
  "応募": "STEP2",
  "選定": "STEP2",
  "内定": "STEP3",
  "承諾": "STEP3",
};

// 学生データ
export interface Student {
  id: string;
  name: string;
  phase: Phase;
  email?: string;
  university?: string;
  department?: string;
  viewedVideos: string[]; // 視聴した動画ID
  viewCounts: Record<string, number>; // 動画IDごとの視聴回数
  watchTime: Record<string, number>; // 動画IDごとの視聴時間（秒）
  viewedBrochures: string[]; // 閲覧したパンフレットID
  brochureViewCounts: Record<string, number>; // パンフレットIDごとの閲覧回数
  viewedArticles: string[]; // 閲覧した記事ID
  articleReadCounts: Record<string, number>; // 記事IDごとの閲覧回数
}

// モックデータ生成
const studentNames = [
  "田中太郎", "佐藤花子", "鈴木一郎", "高橋美咲", "渡辺健太",
  "伊藤さくら", "山本隆", "中村由美", "小林大輔", "加藤彩",
  "吉田翔", "山田愛", "佐々木健", "松本絵美", "井上拓也",
  "木村優子", "林修平", "清水真理", "山崎大樹", "森川あかり",
  "池田慎一", "橋本奈々", "石川雄介", "前田千尋", "藤田達也",
  "岡田恵子", "村田浩二", "近藤麻衣", "斉藤洋平", "長谷川由紀",
];

const universities = [
  "東京大学", "早稲田大学", "慶應義塾大学", "京都大学", "大阪大学",
  "一橋大学", "東京工業大学", "北海道大学", "東北大学", "名古屋大学"
];

const departments = [
  "経済学部", "法学部", "商学部", "文学部", "理工学部",
  "工学部", "情報学部", "経営学部", "政治学部", "教育学部"
];

// フェーズごとに適切な動画視聴パターンを生成
const getViewPatternByPhase = (phase: Phase): string[] => {
  switch (phase) {
    case "認知":
      return ["v1", "v2", "v3"];
    case "興味":
      return ["v1", "v3", "v4", "v5", "v7"];
    case "応募":
      return ["v3", "v4", "v7", "v9", "v11", "v12"];
    case "選定":
      return ["v3", "v4", "v5", "v7", "v8", "v9", "v10", "v11", "v12", "v13"];
    case "内定":
      return ["v7", "v8", "v11", "v12", "v13", "v14", "v15", "v16"];
    case "承諾":
      return ["v8", "v12", "v13", "v14", "v15", "v16"];
    default:
      return [];
  }
};

const getBrochurePatternByPhase = (phase: Phase): string[] => {
  switch (phase) {
    case "認知":
      return ["b1"];
    case "興味":
      return ["b1", "b2"];
    case "応募":
      return ["b1", "b3"];
    case "選定":
      return ["b1", "b2", "b3"];
    case "内定":
    case "承諾":
      return ["b1", "b3", "b4"];
    default:
      return [];
  }
};

const getArticlePatternByPhase = (phase: Phase): string[] => {
  switch (phase) {
    case "認知":
      return ["a1"];
    case "興味":
      return ["a1", "a2"];
    case "応募":
      return ["a2", "a3"];
    case "選定":
      return ["a1", "a2", "a3"];
    case "内定":
    case "承諾":
      return ["a2", "a4"];
    default:
      return [];
  }
};

// ランダムに視聴回数を生成（1-3回）
const generateViewCounts = (videoIds: string[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  videoIds.forEach(id => {
    counts[id] = Math.floor(Math.random() * 3) + 1;
  });
  return counts;
};

// ランダムに視聴時間を生成（動画の長さの30%-95%）
const generateWatchTime = (videoIds: string[]): Record<string, number> => {
  const times: Record<string, number> = {};
  videoIds.forEach(id => {
    const video = videos.find(v => v.id === id);
    if (video) {
      const minPercent = 0.3;
      const maxPercent = 0.95;
      const percent = minPercent + Math.random() * (maxPercent - minPercent);
      times[id] = Math.floor(video.duration * percent);
    }
  });
  return times;
};

// 各フェーズに5人の学生を生成
export const students: Student[] = phases.flatMap((phase, phaseIndex) => {
  return Array.from({ length: 5 }, (_, i) => {
    const studentIndex = phaseIndex * 5 + i;
    const baseVideos = getViewPatternByPhase(phase);

    // ランダムに1-2本追加/削除してバリエーションを持たせる
    let viewedVideos = [...baseVideos];
    if (Math.random() > 0.5 && viewedVideos.length > 2) {
      // 1本削除
      viewedVideos.splice(Math.floor(Math.random() * viewedVideos.length), 1);
    }
    if (Math.random() > 0.5) {
      // 1本追加
      const allVideoIds = videos.map(v => v.id);
      const unwatchedVideos = allVideoIds.filter(id => !viewedVideos.includes(id));
      if (unwatchedVideos.length > 0) {
        viewedVideos.push(unwatchedVideos[Math.floor(Math.random() * unwatchedVideos.length)]);
      }
    }

    const name = studentNames[studentIndex];
    const emailPrefix = name.replace(/[太郎花子一郎美咲健太さくら隆由美大輔彩翔愛健絵美拓也優子修平真理大樹あかり慎奈々雄介千尋達也]/g, '');

    // パンフレットと記事の閲覧データ生成
    const baseBrochures = getBrochurePatternByPhase(phase);
    const baseArticles = getArticlePatternByPhase(phase);

    return {
      id: `s${studentIndex + 1}`,
      name: studentNames[studentIndex],
      phase,
      email: `${emailPrefix.toLowerCase()}${studentIndex + 1}@example.com`,
      university: universities[Math.floor(Math.random() * universities.length)],
      department: departments[Math.floor(Math.random() * departments.length)],
      viewedVideos: viewedVideos.sort(),
      viewCounts: generateViewCounts(viewedVideos),
      watchTime: generateWatchTime(viewedVideos),
      viewedBrochures: baseBrochures,
      brochureViewCounts: generateViewCounts(baseBrochures),
      viewedArticles: baseArticles,
      articleReadCounts: generateViewCounts(baseArticles),
    };
  });
});

// 統計データを計算
export const getVideoStatsByPhase = (phase: Phase) => {
  const phaseStudents = students.filter(s => s.phase === phase);
  const stats: Record<string, number> = {};

  videos.forEach(video => {
    stats[video.id] = phaseStudents.filter(s =>
      s.viewedVideos.includes(video.id)
    ).length;
  });

  return stats;
};

export const getVideoStatsTotal = () => {
  const stats: Record<string, number> = {};

  videos.forEach(video => {
    stats[video.id] = students.filter(s =>
      s.viewedVideos.includes(video.id)
    ).length;
  });

  return stats;
};

export const getCategoryStats = (phase?: Phase) => {
  const targetStudents = phase
    ? students.filter(s => s.phase === phase)
    : students;

  const categoryGroups = {
    "目標の魅力": ["v1", "v2", "v3", "v4"],
    "人材の魅力": ["v5", "v6", "v7", "v8"],
    "活動の魅力": ["v9", "v10", "v11", "v12"],
    "条件の魅力": ["v13", "v14", "v15", "v16"],
  };

  const stats: Record<string, number> = {};

  Object.entries(categoryGroups).forEach(([category, videoIds]) => {
    let totalViews = 0;
    targetStudents.forEach(student => {
      videoIds.forEach(videoId => {
        if (student.viewedVideos.includes(videoId)) {
          totalViews += student.viewCounts[videoId] || 0;
        }
      });
    });
    stats[category] = totalViews;
  });

  return stats;
};

// 時間をフォーマットする関数
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// 視聴時間の統計を取得
export const getWatchTimeStatsByPhase = (phase: Phase) => {
  const phaseStudents = students.filter(s => s.phase === phase);
  const stats: Record<string, number> = {};

  videos.forEach(video => {
    let totalWatchTime = 0;
    phaseStudents.forEach(student => {
      if (student.watchTime[video.id]) {
        totalWatchTime += student.watchTime[video.id];
      }
    });
    stats[video.id] = totalWatchTime;
  });

  return stats;
};

export const getWatchTimeStatsTotal = () => {
  const stats: Record<string, number> = {};

  videos.forEach(video => {
    let totalWatchTime = 0;
    students.forEach(student => {
      if (student.watchTime[video.id]) {
        totalWatchTime += student.watchTime[video.id];
      }
    });
    stats[video.id] = totalWatchTime;
  });

  return stats;
};

// カテゴリごとの視聴時間を取得
export const getCategoryWatchTimeStats = (phase?: Phase) => {
  const targetStudents = phase
    ? students.filter(s => s.phase === phase)
    : students;

  const categoryGroups = {
    "目標の魅力": ["v1", "v2", "v3", "v4"],
    "人材の魅力": ["v5", "v6", "v7", "v8"],
    "活動の魅力": ["v9", "v10", "v11", "v12"],
    "条件の魅力": ["v13", "v14", "v15", "v16"],
  };

  const stats: Record<string, number> = {};

  Object.entries(categoryGroups).forEach(([category, videoIds]) => {
    let totalWatchTime = 0;
    targetStudents.forEach(student => {
      videoIds.forEach(videoId => {
        if (student.watchTime[videoId]) {
          totalWatchTime += student.watchTime[videoId];
        }
      });
    });
    stats[category] = totalWatchTime;
  });

  return stats;
};

// パンフレットデータ
export const brochures: Brochure[] = [
  {
    id: "b1",
    title: "会社案内パンフレット 2026",
    description: "企業概要、事業内容、企業理念を分かりやすくまとめた総合パンフレット",
    thumbnail: "https://images.unsplash.com/photo-1707299651614-18f443d09e5a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21wYW55JTIwYnJvY2h1cmUlMjBjYXRhbG9nJTIwYnVzaW5lc3N8ZW58MXx8fHwxNzcyNzY2MjcwfDA&ixlib=rb-4.1.0&q=80&w=1080",
    pages: 24,
    category: "企業情報"
  },
  {
    id: "b2",
    title: "事業紹介資料",
    description: "各事業部門の詳細な紹介資料。具体的なプロジェクト事例も掲載",
    thumbnail: "https://images.unsplash.com/photo-1590098563734-bcea80ce34c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHByZXNlbnRhdGlvbiUyMHNsaWRlcyUyMGRlY2t8ZW58MXx8fHwxNzcyNzY2MjcxfDA&ixlib=rb-4.1.0&q=80&w=1080",
    pages: 32,
    category: "事業内容"
  },
  {
    id: "b3",
    title: "採用案内ガイドブック",
    description: "新卒採用の詳細情報、選考フロー、福利厚生をまとめたガイド",
    thumbnail: "https://images.unsplash.com/photo-1620887134181-fa28241f227d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWNydWl0bWVudCUyMGd1aWRlJTIwYm9va2xldCUyMGluZm9ybWF0aW9ufGVufDF8fHx8MTc3Mjc2NjI3Mnww&ixlib=rb-4.1.0&q=80&w=1080",
    pages: 16,
    category: "採用情報"
  },
  {
    id: "b4",
    title: "企業レポート 2025",
    description: "企業の財務状況、経営方針、今後の展望をまとめた年次レポート",
    thumbnail: "https://images.unsplash.com/photo-1516409590654-e8d51fc2d25c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3Jwb3JhdGUlMjBkb2N1bWVudCUyMGFubnVhbCUyMHJlcG9ydHxlbnwxfHx8fDE3NzI3NjYyNzF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    pages: 48,
    category: "企業情報"
  }
];

// 記事データ
export const articles: Article[] = [
  {
    id: "a1",
    title: "代表インタビュー：これからの10年を見据えた経営戦略",
    excerpt: "代表取締役が語る、企業の未来像と新しい挑戦について",
    thumbnail: "https://images.unsplash.com/photo-1638342863994-ae4eee256688?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibG9nJTIwYXJ0aWNsZSUyMHdyaXRpbmclMjBidXNpbmVzc3xlbnwxfHx8fDE3NzI3NjYyNzJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    date: "2026年2月20日",
    readTime: 8,
    category: "経営"
  },
  {
    id: "a2",
    title: "若手社員座談会：入社3年目の本音トーク",
    excerpt: "入社して3年が経過した社員たちが、仕事のやりがいや成長について語ります",
    thumbnail: "https://images.unsplash.com/photo-1695668543969-ea7dec95047c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbnRlcnZpZXclMjBlbXBsb3llZSUyMHN0b3J5JTIwdGVzdGltb25pYWx8ZW58MXx8fHwxNzcyNzY2MjcyfDA&ixlib=rb-4.1.0&q=80&w=1080",
    date: "2026年2月15日",
    readTime: 10,
    category: "社員インタビュー"
  },
  {
    id: "a3",
    title: "新プロジェクト始動：社会課題解決への新たな取り組み",
    excerpt: "持続可能な社会の実現に向けた、当社の最新プロジェクトをご紹介",
    thumbnail: "https://images.unsplash.com/photo-1623039405147-547794f92e9e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZXdzJTIwYXJ0aWNsZSUyMGpvdXJuYWxpc20lMjByZWFkaW5nfGVufDF8fHx8MTc3Mjc2NjI3Mnww&ixlib=rb-4.1.0&q=80&w=1080",
    date: "2026年2月10日",
    readTime: 6,
    category: "事業紹介"
  },
  {
    id: "a4",
    title: "キャリアストーリー：新卒入社から管理職になるまで",
    excerpt: "入社10年で部門長になった社員が語る、キャリアの軌跡と成長の秘訣",
    thumbnail: "https://images.unsplash.com/photo-1770922807878-ec02fed1d0c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdWNjZXNzJTIwc3RvcnklMjBhY2hpZXZlbWVudCUyMGNhcmVlcnxlbnwxfHx8fDE3NzI3NjYyNzN8MA&ixlib=rb-4.1.0&q=80&w=1080",
    date: "2026年2月5日",
    readTime: 12,
    category: "社員インタビュー"
  }
];