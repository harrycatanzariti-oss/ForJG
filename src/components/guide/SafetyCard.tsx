/** Help resources shown first when a message suggests danger. */
interface Resource {
  region: string;
  name: string;
  contact: string;
  href: string;
}

export default function SafetyCard({
  title,
  message,
  resources,
}: {
  title: string;
  message: string;
  resources: Resource[];
}) {
  return (
    <section
      class="rounded-2xl border-2 border-red-700 bg-red-50 p-5 text-red-950 dark:border-red-400 dark:bg-red-950 dark:text-red-50"
      role="alert"
      aria-label={title}
    >
      <h2 class="text-xl font-semibold">{title}</h2>
      <p class="mt-2">{message}</p>
      <ul class="mt-4 space-y-2">
        {resources.map((r) => (
          <li key={r.name + r.region} class="rounded-xl bg-white/70 p-3 dark:bg-black/30">
            <span class="block text-sm opacity-80">{r.region}</span>
            <span class="block font-semibold">{r.name}</span>
            {r.href ? (
              <a href={r.href} class="font-semibold text-red-800 underline dark:text-red-200" rel="noopener">
                {r.contact}
              </a>
            ) : (
              <span>{r.contact}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
