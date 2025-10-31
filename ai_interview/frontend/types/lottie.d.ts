declare module '@lottiefiles/lottie-player' {}

declare namespace JSX {
  interface IntrinsicElements {
    'lottie-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      autoplay?: boolean;
      loop?: boolean;
      mode?: string;
      src?: string;
      background?: string;
      speed?: number;
    };
  }
}


