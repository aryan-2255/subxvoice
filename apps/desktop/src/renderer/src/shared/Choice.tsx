// A labelled list of options, used wherever Settings asks the user to pick exactly one thing.
// Shared by both OSes — only the options differ, never the control.

export interface ChoiceOption {
  value: string;
  label: string;
  hint?: string;
}

export function Choice({
  name,
  options,
  value,
  onChange,
  empty,
}: {
  name: string;
  options: ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
  empty?: string;
}) {
  if (options.length === 0) return <p className="text-muted">{empty ?? "Nothing to choose from."}</p>;
  return (
    <div className="space-y-1.5">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-ink/[0.04]"
        >
          <input
            type="radio"
            name={name}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="mt-1 accent-accent"
          />
          <span>
            <span className="font-medium">{option.label}</span>
            {option.hint && <span className="block text-muted">{option.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}
