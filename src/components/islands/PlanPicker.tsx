import { PLANS, type PlanId } from '../../config/school';
import { planAmounts, uah } from '../../lib/pricing';
import './PlanPicker.css';

interface Props {
  name: string;
  value: PlanId;
  early: boolean;
  onChange: (p: PlanId) => void;
  disabled?: boolean;
  onInk?: boolean;
  legend?: string;
  showLegend?: boolean;
}

export default function PlanPicker({ name, value, early, onChange, disabled, onInk, legend = 'Спосіб оплати', showLegend }: Props) {
  return (
    <fieldset class={`plans${onInk ? ' plans--ink' : ''}`} disabled={disabled}>
      <legend class={showLegend ? 'plans__legend' : 'sr-only'}>{legend}</legend>
      {PLANS.map((p) => {
        const a = planAmounts(p.id, early);
        return (
          <label class="plan" key={p.id}>
            <input type="radio" name={name} value={p.id} checked={value === p.id} onChange={() => onChange(p.id)} />
            <span class="plan__radio" aria-hidden="true" />
            <span class="plan__txt">
              <span class="plan__title">{p.title}</span>
              <span class="plan__sum tnum">{a.parts === 1 ? uah(a.total) : `${a.parts} × ${uah(a.perPart)}`}</span>
              <span class="plan__note">{p.note}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
