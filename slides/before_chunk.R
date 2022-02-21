
library(fontawesome)
library(ggtext)
library(glue)
library(here)
library(knitr)
library(kableExtra)
library(lubridate)
library(patchwork)
library(readxl)
library(sf)
library(showtext)
library(tidyverse)
library(viridis)
library(xaringanExtra)
library(xaringanthemer)

set.seed(12345)

knitr::opts_chunk$set(
  echo = FALSE,
  warning = FALSE,
  message = FALSE,
  error = FALSE,
  collapse = TRUE, 
  strip.white = TRUE,
  fig.align = "center",
  fig.asp = 0.7,
  fig.retina = 3,
  dev = "svglite"
)

options(
  digits = 3,
  htmltools.dir.version = FALSE,
  str = strOptions(vec.len = 3),
  knitr.kable.NA = ''
)

# just a short-hand for loading figures
figure <- function(x) {
  
  full_path <- file.path("images", x)
  
  knitr::include_graphics(full_path)
  
}

sysfonts::font_add_google("Noto Sans")

# ggplot theme
ggplot2::theme_set(ggplot2::theme_bw(18))
ggplot2::theme_update(
  panel.grid = element_blank(),
  text = element_text(family = "Noto Sans"),
  plot.margin = margin(0, 0, 0, 0, "null")
)

# generate loads of variations on the color palette with different opacity
qaad_colors <- function(...){
  
  qaad_palette <- c(
    flame_orange = "#F15A29",
    celadon_blue = "#477998",
    rufous_red = "#A20000",
    dark_purple = "#0F0326",
    maize_crayola = "#FACC4E",
    powder_blue = "#B6E1E1"
  )
  
  choices <- unlist(list(...))
  
  if (length(choices) == 0) return(names(qaad_palette))
  
  selection <- qaad_palette[choices]
  
  unname(selection)
  
} 

qaad_colors_with_alphas <- lapply(
  qaad_colors(),
  function(x){
    
    o <- seq(0.1, 0.9, by = 0.1)
    
    this_color <- qaad_colors(x)
    
    alphas <- c(ggplot2::alpha(this_color, o), this_color)
    
    names(alphas) <- c(paste0(x, "_o_" , o*100), x)
    
    alphas
    
  })

xaringanthemer::style_duo_accent(
  primary_color = "#5E5E5E",
  secondary_color = "#A20000",
  colors = unlist(qaad_colors_with_alphas),
  inverse_header_color = "#FFFFFF",
  code_font_google = google_font("Fira Mono"),
  header_h1_font_size = "45px",
  header_h2_font_size = "35px",
  header_h3_font_size = "20px"
)

xaringanExtra::use_tachyons()
xaringanExtra::use_scribble()
xaringanExtra::use_tile_view()
xaringanExtra::use_animate_css()
xaringanExtra::use_panelset()
xaringanExtra::use_share_again()

# https://community.rstudio.com/t/how-to-add-a-hyperlink-to-an-image-created-by-knitr-include-graphics/99195
image_link <- function(image, url, ...){
  
  htmltools::a(
    href=url,
    htmltools::img(src=image,...)
  )
  
}
