import { useEffect, useState } from 'preact/hooks';
import { DEFAULT_GROUP, type GroupId } from '../config/school';
import { getSchedule, type Schedule } from './schedule';
import { emptyState, getState, subscribe, type DemoState } from './store';

const SSR_STATE: DemoState = emptyState();

/**
 * Стан демо. Перший рендер завжди «порожній» — так само, як у статичному HTML,
 * тож гідратація не розходиться; реальні дані з localStorage підставляємо після.
 */
export function useDemo(): DemoState {
  const [s, set] = useState<DemoState>(SSR_STATE);
  useEffect(() => {
    set(getState());
    return subscribe(() => set(getState()));
  }, []);
  return s;
}

/**
 * Годинник демо. `ssrNow` — момент збірки сторінки: з ним перший рендер
 * збігається зі статичним HTML. `tick` — як часто оновлювати (мс), 0 — не оновлювати.
 */
export function useClock(ssrNow: number, state: DemoState, tick = 0) {
  const [real, setReal] = useState(ssrNow);
  useEffect(() => {
    setReal(Date.now());
    if (!tick) return;
    const id = setInterval(() => setReal(Date.now()), tick);
    return () => clearInterval(id);
  }, [tick]);
  const now = real + (state.timeOffset || 0);
  const schedule: Schedule = getSchedule(real);
  return { real, now, schedule };
}

// ——— Обрана група: спільна для першого екрана, липкої панелі й блоку цін ———

let selected: GroupId = DEFAULT_GROUP;
const groupListeners = new Set<(g: GroupId) => void>();

export function setSelectedGroup(g: GroupId) {
  selected = g;
  for (const l of groupListeners) l(g);
}

export function useSelectedGroup(): [GroupId, (g: GroupId) => void] {
  const [g, set] = useState<GroupId>(DEFAULT_GROUP);
  useEffect(() => {
    set(selected);
    groupListeners.add(set);
    return () => void groupListeners.delete(set);
  }, []);
  return [g, setSelectedGroup];
}

/** Перемикає true/false точно в момент дедлайну, без щосекундних рендерів. */
export function useBefore(deadline: number, now: number, offset: number): boolean {
  const [before, setBefore] = useState(now < deadline);
  useEffect(() => {
    setBefore(now < deadline);
    const left = deadline - (Date.now() + offset);
    if (left <= 0 || left > 2 ** 31 - 1) return;
    const id = setTimeout(() => setBefore(false), left + 50);
    return () => clearTimeout(id);
  }, [deadline, now, offset]);
  return before;
}
