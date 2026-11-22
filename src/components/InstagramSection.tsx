import logo from "../assets/logo.jpeg";

const imgSrc = (img: string | { src?: string }) =>
  typeof img === "string" ? img : img.src;

export default function InstagramSection() {
  return (
    <section
      className="py-20 px-6 bg-background"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Instagram
          </h2>
          <p className="text-md text-muted-foreground">
            follow my business page
          </p>
        </div>

        {/* Instagram profile header (from screenshot) */}
        <a
          href="https://www.instagram.com/cherry.brushh/"
          target="_blank"
          rel="noopener"
          className="block"
        >
          <div className="max-w-7xl border mx-auto rounded-lg shadow-md space-y-8 px-6 py-6 cursor-pointer">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="shrink-0">
                <img
                  src={imgSrc(logo)}
                  alt="Cherry Brush profile"
                  className="w-32 h-32 rounded-full border-2 border-white bg-zinc-200 dark:bg-zinc-800 object-cover shadow-lg"
                loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-normal text-foreground">
                  cherry.brushh
                </h1>
                <div className="flex items-baseline gap-4 text-sm text-muted-foreground mt-1">
                  <span className="font-semibold text-foreground">9,952</span>{" "}
                  <span>followers</span>
                  <span className="font-semibold text-foreground">90</span>{" "}
                  <span>following</span>
                </div>
                <div className="mt-3 text-sm text-foreground">
                  Cherrybrush | Press on nails
                </div>
                <ul className="mt-2 space-y-1 text-sm text-foreground">
                  <li>✈️ Ships Worldwide</li>
                  <li>❤️ Custom orders : Always yes.</li>
                  <li>📍 Malviya Nagar,Jaipur</li>
                  <li>First time with press-ons? Let's glam you up!</li>
                  <li className="text-muted-foreground">By @mansi.diary</li>
                  <li>💜 Tap to shop 👆</li>
                </ul>
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>🔗</span>
                  <a
                    href="https://www.cherrybrush.in"
                    target="_blank"
                    rel="noopener"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                    onClick={(e) => e.stopPropagation()}
                  >
                    www.cherrybrush.in
                  </a>
                  <span className="text-xs">and 1 more</span>
                </div>
              </div>
            </div>
          </div>
        </a>
      </div>
    </section>
  );
}
