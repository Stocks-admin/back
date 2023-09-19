SELECT
  `t`.`user_id` AS `user_id`,
  SUM(
    CASE
      WHEN `t`.`transaction_type` = 'deposit' THEN `t`.`amount_sold`
      WHEN `t`.`transaction_type` = 'withdraw' THEN -`t`.`amount_sold`
      WHEN `t`.`transaction_type` = 'sell' THEN `t`.`amount_sold` * `t`.`symbol_price`
      WHEN `t`.`transaction_type` = 'buy' THEN -(`t`.`amount_sold` * `t`.`symbol_price`)
      ELSE 0
    END
  ) AS `amount`
FROM
  (
    `stocks_management`.`transactions` `t`
    JOIN (
      SELECT
        `stocks_management`.`user_wallet`.`user_id` AS `user_id`,
        MAX(`stocks_management`.`user_wallet`.`updated_at`) AS `last_update`
      FROM
        `stocks_management`.`user_wallet`
      GROUP BY
        `stocks_management`.`user_wallet`.`user_id`
    ) `up` ON(`t`.`user_id` = `up`.`user_id`)
  )
WHERE
  `t`.`transaction_date` > `up`.`last_update`
GROUP BY
  `t`.`user_id`;