export default function AboutMe() {
  return (
    <section className="py-20 px-6 bg-background">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-xs font-semibold text-neutral-700 tracking-wide">
          <span>📍 Studio in Jaipur, India</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-bold text-foreground">
          About Cherrybrush | Booking Service
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Welcome to Cherrybrush, your dedicated nail art studio in Jaipur, Rajasthan.
          We provide high-precision nail art, durable gel extensions, acrylic nail overlays,
          and customized nail styling for weddings, parties, and everyday professional wear.
        </p>
        <p className="text-base text-muted-foreground leading-relaxed">
          Our online appointment booking platform allows you to browse services we provide,
          pick your preferred date and time slots, and secure your visit with zero waiting time.
          All services are conducted following strict sterilization and hygiene protocols right
          here in Jaipur, India.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border">
          <div>
            <span className="block text-2xl font-bold text-foreground">100%</span>
            <span className="text-xs text-muted-foreground">Sterilized Equipment</span>
          </div>
          <div>
            <span className="block text-2xl font-bold text-foreground">Top Rated</span>
            <span className="text-xs text-muted-foreground">Nail Art in Jaipur</span>
          </div>
          <div>
            <span className="block text-2xl font-bold text-foreground">Online</span>
            <span className="text-xs text-muted-foreground">Appointment Booking</span>
          </div>
          <div>
            <span className="block text-2xl font-bold text-foreground">Jaipur, IN</span>
            <span className="text-xs text-muted-foreground">Convenient Location</span>
          </div>
        </div>
      </div>
    </section>
  );
}
