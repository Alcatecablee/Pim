import { motion, HTMLMotionProps } from "framer-motion";
import { Button, ButtonProps } from "@/components/ui/button";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedButtonProps extends ButtonProps {
  pulse?: boolean;
  bounceOnHover?: boolean;
}

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ pulse, bounceOnHover, className, children, ...props }, ref) => {
    const variants = {
      initial: { scale: 1 },
      hover: bounceOnHover ? { scale: 1.05 } : { scale: 1 },
      tap: { scale: 0.95 },
      pulse: pulse
        ? {
            scale: [1, 1.05, 1],
            transition: {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut" as const,
            },
          }
        : {},
    };

    return (
      <motion.div
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        animate={pulse ? "pulse" : "initial"}
        variants={variants}
        className="inline-block"
      >
        <Button ref={ref} className={className} {...props}>
          {children}
        </Button>
      </motion.div>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";
