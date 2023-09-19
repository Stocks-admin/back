SELECT
  `t`.`user_id` AS `user_id`,
  `t`.`symbol` AS `symbol`,
  sum(
    CASE
      WHEN `t`.`transaction_type` = 'buy' THEN `t`.`amount_sold`
      ELSE - `t`.`amount_sold`
    END
  ) AS `amount`
FROM
  (
    `stocks_management`.`transactions` `t`
    JOIN (
      SELECT
        `stocks_management`.`user_portfolio`.`user_id` AS `user_id`,
        `stocks_management`.`user_portfolio`.`symbol` AS `symbol`,
        max(
          `stocks_management`.`user_portfolio`.`updated_at`
        ) AS `last_update`
      FROM
        `stocks_management`.`user_portfolio`
      GROUP BY
        `stocks_management`.`user_portfolio`.`user_id`,
        `stocks_management`.`user_portfolio`.`symbol`
    ) `up` ON(
      `t`.`user_id` = `up`.`user_id`
      AND `t`.`symbol` = `up`.`symbol`
    )
  )
WHERE
  `t`.`transaction_date` > `up`.`last_update`
  AND (
    `t`.`transaction_type` = 'buy'
    OR `t`.`transaction_type` = 'sell'
  )
GROUP BY
  `t`.`user_id`,
  `t`.`symbol`