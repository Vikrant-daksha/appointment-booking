export default function AboutMe() {
  return (
    <section className="py-20 px-6 bg-background">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700 tracking-wide"></div>
        <h2 className="text-3xl md:text-5xl font-bold text-foreground">
          About Cherrybrush
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Welcome to Cherrybrush, your dedicated nail art studio in Jaipur,
          Rajasthan. We provide high-precision nail art, durable gel extensions,
          acrylic nail overlays, and customized nail styling for weddings,
          parties, and everyday professional wear.
        </p>
      </div>
    </section>
  );
}
