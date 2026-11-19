import type { PrivacyCopy } from './content';
import { isPrivacyDraft, type PrivacyConfig } from './config';

export function PrivacyDocument({ copy, config }: { copy: PrivacyCopy; config: PrivacyConfig }) {
  const draft = isPrivacyDraft(config);
  return (
    <article className="privacy-document">
      <header className="privacy-intro">
        <span className="privacy-eyebrow">REMORY · PRIVACY</span>
        <h1>{copy.title}</h1>
        <p>{copy.lead}</p>
        <dl className="privacy-dates">
          <div><dt>{copy.updated}</dt><dd><time dateTime={config.updatedAt}>{config.updatedAt}</time></dd></div>
          <div><dt>{copy.effective}</dt><dd>{config.effectiveDate
            ? <time dateTime={config.effectiveDate}>{config.effectiveDate}</time> : copy.notSet}</dd></div>
        </dl>
      </header>
      {draft && <aside className="privacy-draft" role="note">
        <strong>{copy.draftTitle}</strong><p>{copy.draftNote}</p>
      </aside>}
      <dl className="privacy-operator">
        <div><dt>{copy.operator}</dt><dd>{config.operatorName || copy.notSet}</dd></div>
        <div><dt>{copy.contact}</dt><dd>{config.contactEmail
          ? <a href={`mailto:${encodeURIComponent(config.contactEmail)}`}>{config.contactEmail}</a> : copy.notSet}</dd></div>
        <div><dt>{copy.country}</dt><dd>{config.serverCountry === 'KR' ? copy.korea : config.serverCountry || copy.notSet}</dd></div>
      </dl>
      <nav className="privacy-contents" aria-label={copy.contents}>
        <h2>{copy.contents}</h2>
        <ol>{copy.sections.map((section) => <li key={section.id}>
          <a href={`#privacy-${section.id}`}>{section.title}</a>
        </li>)}</ol>
      </nav>
      {copy.sections.map((section, index) => (
        <section className="privacy-section" id={`privacy-${section.id}`} key={section.id}
          aria-labelledby={`privacy-${section.id}-title`}>
          <h2 id={`privacy-${section.id}-title`}><span>{String(index + 1).padStart(2, '0')}</span>{section.title}</h2>
          {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {section.items && <dl className="privacy-facts">{section.items.map((item) => <div key={item.label}>
            <dt>{item.label}</dt><dd>{item.text}</dd>
          </div>)}</dl>}
          {section.links && <ul className="privacy-links">{section.links.map((link) => <li key={link.href}>
            <a href={link.href} target={link.href.startsWith('https:') ? '_blank' : undefined}
              rel={link.href.startsWith('https:') ? 'noopener noreferrer' : undefined}>{link.label}</a>
          </li>)}</ul>}
        </section>
      ))}
      <footer className="privacy-contact">
        <h2>{copy.contactTitle}</h2>
        <p>{copy.contactNote}</p>
        <strong>{config.operatorName || copy.notSet}</strong>
        {config.contactEmail && <a href={`mailto:${encodeURIComponent(config.contactEmail)}`}>{config.contactEmail}</a>}
      </footer>
    </article>
  );
}
