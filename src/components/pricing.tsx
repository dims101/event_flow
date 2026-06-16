"use client";

import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
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
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-slate-100">
          {title}
        </h2>
        <p className="text-slate-400 text-lg whitespace-pre-line max-w-2xl mx-auto">
          {description}
        </p>
      </div>

      <div className="flex justify-center items-center gap-3 mb-12">
        <span className={cn("text-sm font-medium transition-colors", isMonthly ? "text-slate-100" : "text-slate-400")}>
          Bulanan
        </span>
        <Label className="relative inline-flex items-center cursor-pointer">
          <Switch
            ref={switchRef as any}
            checked={!isMonthly}
            onCheckedChange={handleToggle}
            className="relative"
          />
        </Label>
        <span className={cn("text-sm font-semibold transition-colors flex items-center gap-1.5", !isMonthly ? "text-slate-100" : "text-slate-400")}>
          Tahunan <span className="text-indigo-400 text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 font-bold">(Hemat 20%)</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
        {plans.map((plan, index) => (
          <motion.div
            key={index}
            initial={{ y: 50, opacity: 0.8 }}
            whileInView={
              isDesktop
                ? {
                    y: plan.isPopular ? -16 : 0,
                    opacity: 1,
                    scale: plan.isPopular ? 1.03 : 0.98,
                  }
                : { opacity: 1 }
            }
            viewport={{ once: true }}
            transition={{
              duration: 0.8,
              type: "spring",
              stiffness: 100,
              damping: 25,
            }}
            className={cn(
              "rounded-2xl border p-6 bg-slate-900/60 backdrop-blur-md text-center flex flex-col relative transition-all duration-300",
              plan.isPopular 
                ? "border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.15)] bg-slate-900/80" 
                : "border-slate-800 hover:border-slate-700",
              index === 0 && "md:origin-right",
              index === 2 && "md:origin-left"
            )}
          >
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 py-1 px-3.5 rounded-full flex items-center gap-1 shadow-md">
                <Star className="text-white h-3.5 w-3.5 fill-current" />
                <span className="text-white text-xs font-bold tracking-wide font-sans">
                  Paling Populer
                </span>
              </div>
            )}
            <div className="flex-1 flex flex-col justify-between h-full">
              <div>
                <p className="text-sm font-bold tracking-wider text-indigo-400 uppercase font-mono">
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
                    <span className="text-xs font-medium text-slate-400">
                      / {plan.period === "per month" ? "bln" : plan.period}
                    </span>
                  )}
                </div>

                <p className="mt-1.5 text-xs text-slate-400">
                  {isMonthly ? "ditagih bulanan" : "ditagih tahunan"}
                </p>

                <p className="mt-4 text-sm text-slate-300 leading-relaxed min-h-[40px]">
                  {plan.description}
                </p>

                <hr className="w-full my-6 border-slate-800" />

                <ul className="space-y-3.5 text-slate-300 text-sm">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <Check className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                      <span className="text-left leading-normal">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Link
                  href={plan.href}
                  className={cn(
                    buttonVariants({
                      variant: plan.isPopular ? "default" : "outline",
                    }),
                    "group relative w-full gap-2 overflow-hidden text-sm font-bold tracking-tight py-6 rounded-xl transition-all duration-300 ease-out",
                    plan.isPopular
                      ? "bg-indigo-600 hover:bg-indigo-500 text-white border-transparent"
                      : "bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-100 hover:border-slate-700"
                  )}
                >
                  {plan.buttonText}
                </Link>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
