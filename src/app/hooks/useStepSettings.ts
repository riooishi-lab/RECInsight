import { useState, useEffect } from 'react';
import type { Phase } from '../../lib/supabase';

export const ALL_PHASES: Phase[] = ['認知', '興味', '応募', '選定', '内定', '承諾'];

export interface StepConfig {
  id: string;       // "STEP1", "STEP2", etc.
  name: string;     // Display name
  subtitle: string; // e.g., "認知・興味期"
  phases: Phase[];  // Phases belonging to this step
  purpose: string;
  color: string;
  bgColor: string;
}

export interface StepSettings {
  enabled: boolean;
  steps: StepConfig[];
}

const STEP_PALETTE = [
  { color: '#5CA7D1', bgColor: '#E1F1F9' },
  { color: '#0079B3', bgColor: '#CCE7F5' },
  { color: '#7DBDDD', bgColor: '#E8F4F8' },
  { color: '#4A90D9', bgColor: '#D6E8F7' },
  { color: '#2C6FAC', bgColor: '#C2D9F0' },
  { color: '#6AB8E8', bgColor: '#DFF0FB' },
];

const DEFAULT_PURPOSES: Record<number, string> = {
  0: '視覚的な親しみと信頼感を与え、選考参加ハードルを下げる。エントリー意欲を高める。',
  1: '具体的な仕事内容と成長機会を確認させ、他社と差別化。面接での対話を深める。',
  2: '待遇や環境など「最後に残る不安」を解消し、入社決断を後押しする。',
};

export function generateStepConfigs(count: number): StepConfig[] {
  const phases = ALL_PHASES;
  const result: StepConfig[] = [];
  for (let i = 0; i < count; i++) {
    const startIdx = Math.floor((i * phases.length) / count);
    const endIdx = Math.floor(((i + 1) * phases.length) / count);
    const stepPhases = phases.slice(startIdx, endIdx);
    result.push({
      id: `STEP${i + 1}`,
      name: `STEP${i + 1}`,
      subtitle: stepPhases.length > 0 ? stepPhases.join('・') + '期' : `ステップ${i + 1}`,
      phases: stepPhases,
      purpose: DEFAULT_PURPOSES[i] ?? '',
      color: STEP_PALETTE[i % STEP_PALETTE.length].color,
      bgColor: STEP_PALETTE[i % STEP_PALETTE.length].bgColor,
    });
  }
  return result;
}

const DEFAULT_SETTINGS: StepSettings = {
  enabled: true,
  steps: generateStepConfigs(3),
};

const STORAGE_KEY = 'recruitment-step-settings';

export function getStepSettings(): StepSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as StepSettings;
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveStepSettings(settings: StepSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('step-settings-changed'));
}

export function useStepSettings() {
  const [settings, setSettings] = useState<StepSettings>(() => getStepSettings());

  useEffect(() => {
    const handler = () => setSettings(getStepSettings());
    window.addEventListener('step-settings-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('step-settings-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const updateSettings = (newSettings: StepSettings) => {
    setSettings(newSettings);
    saveStepSettings(newSettings);
  };

  /** フェーズ名 → ステップID へ変換 */
  const phaseToStepId = (phase: string): string => {
    for (const step of settings.steps) {
      if ((step.phases as string[]).includes(phase)) return step.id;
    }
    return settings.steps[0]?.id ?? 'STEP1';
  };

  const stepIds = settings.steps.map((s) => s.id);

  return { settings, updateSettings, phaseToStepId, stepIds };
}
