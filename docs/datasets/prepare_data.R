
library(here)
library(dplyr)
library(readr)


# Advertising -------------------------------------------------------------

# advertising dataset used in James et al (2021) Introduction to Statistical Learning

advertising <- read_csv("https://www.statlearning.com/s/Advertising.csv")

advertising <- advertising %>% 
  rename_with(tolower) %>% 
  select(sales, tv, radio, newspaper)

write_csv(
  advertising, 
  file = here("datasets", "advertising.csv")
)

# Kid's IQ ----------------------------------------------------------------

# https://cran.r-project.org/web/packages/rstanarm/rstanarm.pdf

library(rstanarm)

kidiq <- kidiq %>% 
  rename(
    "kid" = kid_score,
    "mom" = mom_iq
  ) %>% 
  select(kid, mom, everything())

write_csv(
  kidiq,
  file = here("datasets", "kidiq.csv")
)

# Snodgrass ---------------------------------------------------------------

library(archdata)

data("Snodgrass")  

Snodgrass %>% 
  as_tibble() %>% 
  rename_with(tolower) %>% 
  mutate(inside = ifelse(inside == "Inside", 1L, 0L)) %>% 
  write_csv(here("datasets", "snodgrass.csv"))

# Site counts by elevation ------------------------------------------------

n <- 100

set.seed(123)

elevation <- rnorm(n, mean = 1.5, sd = 0.3)

b0 <- log(2)
b1 <- log(3.5)

lambda <- exp(b0 + b1 * elevation) 

sites <- rpois(n, lambda)

write_csv(
  tibble(sites, elevation),
  here("datasets", "site_counts.csv")
)

# Grave goods by distance from great house --------------------------------

n <- 100

set.seed(123)

distance <- runif(n, min = 0.01, max = 8)
distance <- round(distance, digits = 3)

b0 <- log(7)
b1 <- log(0.73)

lambda <- exp(b0 + b1 * distance) 

goods <- rpois(n, lambda)

write_csv(
  tibble(goods, distance),
  here("datasets", "grave_goods.csv")
)

# Site counts per unit area by elevation ----------------------------------

n <- 100

set.seed(123)

elevation <- rnorm(n, mean = 1.5, sd = 0.3)

b0 <- log(2)
b1 <- log(3.1)

area <- abs(rnorm(n, mean = 4, sd = 1.6))

ba <- 1.4

lambda <- exp(b0 + b1 * elevation + ba * log(area)) 

sites <- rpois(n, lambda)

surveys <- tibble(
  block = 1:n,
  sites = sites,
  area = area,
  elevation = elevation
)

write_csv(
  surveys,
  here("datasets", "surveys.csv")
)
