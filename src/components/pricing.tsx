"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Star, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState, useRef } from "react";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";

interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
}

interface PricingProps {
  plans: PricingPlan[];
  title?: string;
  description?: string;
}

export function Pricing({
  plans,
  title = "Simple, Transparent Pricing",
  description = "Choose the plan that works for you.\nAll plans include access to our platform, lead generation tools, and dedicated support.",
}: PricingProps) {
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const switchRef = useRef<HTMLButtonElement>(null);

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);
    if (checked && switchRef.current) {
      const rect = switchRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: [
          "#4f46e5", // Indigo-600
          "#6366f1", // Indigo-500
          "#0c66e4", // Atlassian Blue
          "#38bdf8", // Sky-400
          "#ffffff", // White
        ],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ["circle"],
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-20 relative z-10">
      
      {/* Header section with geometric Grotesk structure */}
      <div className="text-center space-y-4 mb-16">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/5 bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] select-none">
          Investasi EO
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-100">
          {title}
        </h2>
        <p className="text-slate-400 text-base md:text-lg whitespace-pre-line max-w-2xl mx-auto font-medium">
          {description}
        </p>
      </div>

      {/* Styled Double Bezel Switch wrapper */}
      <div className="flex justify-center items-center gap-3.5 mb-16">
        <span className={cn("text-sm font-semibold transition-colors duration-300", isMonthly ? "text-slate-100" : "text-slate-400")}>
          Bulanan
        </span>
        <div className="bg-white/5 border border-white/10 rounded-full p-1 flex items-center justify-center backdrop-blur-md">
          <Label className="relative inline-flex items-center cursor-pointer">
            <Switch
              ref={switchRef as any}
              checked={!isMonthly}
              onCheckedChange={handleToggle}
              className="relative"
            />
          </Label>
        </div>
        <span className={cn("text-sm font-semibold transition-colors duration-300 flex items-center gap-1.5", !isMonthly ? "text-slate-100" : "text-slate-400")}>
          Tahunan <span className="text-indigo-400 text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 font-extrabold tracking-wider">(Hemat 20%)</span>
        </span>
      </div>

      {/* Pricing Cards Grid using concentric Double-Bezel structures */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
        {plans.map((plan, index) => {
          const isPopular = plan.isPopular;
          return (
            <motion.div
              key={index}
              initial={{ y: 50, opacity: 0.8 }}
              whileInView={
                isDesktop
                  ? {
                      y: isPopular ? -16 : 0,
                      opacity: 1,
                      scale: isPopular ? 1.03 : 0.98,
                    }
                  : { opacity: 1, y: 0 }
              }
              viewport={{ once: true, margin: "-100px" }}
              transition={{
                duration: 0.8,
                ease: [0.32, 0.72, 0, 1] as const,
              }}
              className={cn(
                "flex flex-col relative transition-all duration-300",
                index === 0 && "md:origin-right",
                index === 2 && "md:origin-left"
              )}
            >
              {/* Outer Shell container of Double Bezel */}
              <div className={cn(
                "h-full bg-white/5 border rounded-[2.5rem] p-2 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-indigo-500/30",
                isPopular 
                  ? "border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.18)] bg-indigo-500/5 hover:border-indigo-500/50" 
                  : "border-white/10"
              )}>
                
                {/* Inner Core content holder of Double Bezel */}
                <div className="flex-1 bg-slate-950/80 border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[calc(2.5rem-0.5rem)] p-8 flex flex-col justify-between h-full relative">
                  
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-600 py-1 px-4 rounded-full flex items-center gap-1 shadow-md border border-indigo-500/30">
                      <Star className="text-white h-3 w-3 fill-current" />
                      <span className="text-white text-[10px] font-extrabold tracking-wider uppercase font-sans">
                        Paling Populer
                      </span>
                    </div>
                  )}

                  <div className="flex-1 flex flex-col justify-between h-full">
                    <div>
                      <p className="text-xs font-extrabold tracking-widest text-indigo-400 uppercase font-mono">
                        {plan.name}
                      </p>
                      
                      <div className="mt-5 flex items-baseline justify-center gap-x-1">
                        <span className="text-5xl font-extrabold tracking-tight text-slate-100">
                          <NumberFlow
                            value={
                              isMonthly ? Number(plan.price) : Number(plan.yearlyPrice)
                            }
                            locales="id-ID"
                            format={{
                              style: "currency",
                              currency: "IDR",
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }}
                            willChange
                            className="font-variant-numeric: tabular-nums"
                          />
                        </span>
                        {plan.period !== "Next 3 months" && (
                          <span className="text-xs font-semibold text-slate-400">
                            / {plan.period === "per month" ? "bln" : plan.period}
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 text-xs text-slate-400 font-medium">
                        {isMonthly ? "ditagih bulanan" : "ditagih tahunan"}
                      </p>

                      <p className="mt-5 text-sm text-slate-350 leading-relaxed min-h-[48px] font-medium">
                        {plan.description}
                      </p>

                      <hr className="w-full my-6 border-white/5" />

                      <ul className="space-y-3.5 text-slate-300 text-sm font-medium">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <Check className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                            <span className="text-left leading-normal">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Button-in-Button CTA design */}
                    <div className="mt-8">
                      <Link
                        href={plan.href}
                        className={cn(
                          "group relative w-full inline-flex items-center justify-center gap-3 px-6 py-4 font-bold rounded-full transition-all duration-350 active:scale-[0.98]",
                          isPopular
                            ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg hover:shadow-indigo-500/20"
                            : "bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-200"
                        )}
                      >
                        <span>{plan.buttonText}</span>
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
                          isPopular ? "bg-white/15 text-white" : "bg-white/5 text-slate-400"
                        )}>
                          <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </span>
                      </Link>
                    </div>

                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
