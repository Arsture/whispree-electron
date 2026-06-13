import { implementationTone, type PlaceholderGroup } from '../ui-model';
import { StatusPill } from '../components/primitives';

export function PlaceholderSection({ groups }: { readonly groups: readonly PlaceholderGroup[] }) {
  return (
    <div className="placeholder-grid">
      {groups.map((group) => (
        <section className="liquid-card settings-group" key={group.title}>
          <div className="card-heading">
            <h2>{group.title}</h2>
            <StatusPill tone={implementationTone(group.status)} status={group.status}>{group.status}</StatusPill>
          </div>
          <ul className="settings-row-list">
            {group.rows.map((row) => (
              <li key={row}>
                <span>{row}</span>
                <small>planned adapter boundary</small>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
