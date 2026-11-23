import { useState, useEffect } from "react";
import logo from "../assets/logo.jpeg";
import hero1 from "../assets/hero1.jpg";
import hero2 from "../assets/hero2.jpg";
import { Button } from "./ui/Button";

const imgSrc = (img: string | { src?: string }) =>
  typeof img === "string" ? img : img.src;

export default function Hero() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActiveSlide((i) => (i + 1) % 2), 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section
      className="h-[100dvh] md:h-7/8 w-full relative overflow-hidden flex flex-col justify-end"
      style={{ backgroundColor: "#FFF5F5" }}
      aria-label="Hero Section"
    >
      <div className="slider absolute inset-0 z-0 overflow-hidden">
        <img
          src={imgSrc(hero1)}
          alt="Nail Art Studio services in Jaipur"
          className={`slide absolute inset-0 w-full h-full object-cover transition-opacity duration-[1600ms] ease-in-out ${activeSlide === 0 ? "opacity-100 z-1" : "opacity-0"}`}
          loading="eager"
          decoding="async"
        />
        <img
          src={imgSrc(hero2)}
          alt="Professional nail care appointment booking Jaipur"
          className={`slide absolute inset-0 w-full h-full object-cover transition-opacity duration-[1600ms] ease-in-out ${activeSlide === 1 ? "opacity-100 z-1" : "opacity-0"}`}
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#E2B4BD]/35 via-transparent to-transparent z-[5]" />
        <div className="absolute inset-0 bg-white/20 z-[5]" />
      </div>

      <div className="relative z-10 w-full px-6 pb-14">
        <div className="max-w-xl flex flex-col gap-5 items-start text-left">
          {/* Site Logo */}
          <a href="/" className="inline-block" aria-label="Cherrybrush |  Booking Service">
            <img
              src={imgSrc(logo)}
              alt="Cherrybrush |  Booking Service"
              className="h-16 w-auto rounded-sm block object-contain"
            />
          </a>

          {/* Primary High-Ranking SEO Heading */}
          <h1
            className="text-3xl md:text-5xl font-bold tracking-tight text-[#222222]"
            style={{
              textShadow: "0 2px 4px rgba(0,0,0,0.08)",
            }}
          >
            Nail Art Studio in Jaipur
          </h1>

          <p
            className="text-base sm:text-lg max-w-lg text-[#333333] font-medium leading-relaxed"
            style={{
              textShadow: "0 1px 2px rgba(0,0,0,0.06)",
            }}
          >
            Appointment booking & professional nail services in Jaipur, India.
            Get custom nail art, gel extensions, and complete nail care.
          </p>

          <Button className="w-full sm:w-64" onClick={() => (window.location.href = "/book")}>
            Book Appointment
          </Button>
        </div>
      </div>
    </section>
  );
}
