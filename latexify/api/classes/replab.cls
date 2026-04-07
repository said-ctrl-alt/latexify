\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{replab}[2026/04/06 LaTeXify lab report compatibility class]
\LoadClass[12pt,a4paper]{article}

\RequirePackage[utf8]{inputenc}
\RequirePackage[T1]{fontenc}
\RequirePackage[spanish]{babel}
\RequirePackage{amsmath,amssymb,graphicx,booktabs,float,hyperref}
\RequirePackage{geometry}
\geometry{margin=2.5cm}

\makeatletter

\newcommand{\@subtitle}{}
\newcommand{\@course}{}
\newcommand{\@professor}{}
\newcommand{\@affiliation}{}

\def\subtitle{\@ifnextchar={\replab@subtitleeq}{\replab@subtitleplain}}
\def\replab@subtitleeq=#1{\gdef\@subtitle{#1}}
\def\replab@subtitleplain#1{\gdef\@subtitle{#1}}

\def\course{\@ifnextchar={\replab@courseeq}{\replab@courseplain}}
\def\replab@courseeq=#1{\gdef\@course{#1}}
\def\replab@courseplain#1{\gdef\@course{#1}}

\def\professor{\@ifnextchar={\replab@professoreq}{\replab@professorplain}}
\def\replab@professoreq=#1{\gdef\@professor{#1}}
\def\replab@professorplain#1{\gdef\@professor{#1}}

\def\affiliation{\@ifnextchar={\replab@affiliationeq}{\replab@affiliationplain}}
\def\replab@affiliationeq=#1{\gdef\@affiliation{#1}}
\def\replab@affiliationplain#1{\gdef\@affiliation{#1}}

\renewcommand{\maketitle}{%
  \begin{center}
    {\LARGE\bfseries \@title \par}
    \ifx\@subtitle\@empty\else
      \vspace{0.6em}
      {\large \itshape \@subtitle \par}
    \fi
    \vspace{1.0em}
    \ifx\@author\@empty\else
      {\normalsize \@author \par}
    \fi
    \ifx\@affiliation\@empty\else
      \vspace{0.4em}
      {\normalsize \@affiliation \par}
    \fi
    \ifx\@course\@empty\else
      \vspace{0.4em}
      {\small Curso: \@course \par}
    \fi
    \ifx\@professor\@empty\else
      {\small Profesor: \@professor \par}
    \fi
    \ifx\@date\@empty\else
      \vspace{0.6em}
      {\small \@date \par}
    \fi
  \end{center}
  \vspace{1.2em}
}

\makeatother
