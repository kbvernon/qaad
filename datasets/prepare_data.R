
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
