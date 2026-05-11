import { Variants } from "framer-motion";

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } }
};

export const sidebarItemVariants: Variants = {
  initial: { opacity: 0, x: -12 },
  animate: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.04, duration: 0.2, ease: "easeOut" }
  })
};

export const cardVariants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.06, duration: 0.25, ease: "easeOut" }
  }),
  hover: { y: -2, transition: { duration: 0.15 } }
};

export const taskCardVariants: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.1, duration: 0.3, ease: "easeOut" }
  })
};

export const dropdownVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: -8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.15, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, y: -8, transition: { duration: 0.1 } }
};

export const fadeInVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } }
};

export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
};

export const outputTextVariants: Variants = {
  initial: { opacity: 0, filter: "blur(4px)" },
  animate: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.4 } }
};
