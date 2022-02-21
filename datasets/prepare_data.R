
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
