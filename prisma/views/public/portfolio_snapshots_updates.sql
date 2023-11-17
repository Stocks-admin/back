SELECT
  t.user_id,
  t.symbol,
  t.market
  sum(
    CASE
      WHEN (t.transaction_type = 'buy' :: "Transaction_type") THEN t.amount_sold
      ELSE (- t.amount_sold)
    END
  ) AS amount
FROM
  (
    transactions t
    LEFT JOIN (
      SELECT
        portfolio_snapshots.user_id,
        portfolio_snapshots.symbol,
        portfolio_snapshots.market,
        max(portfolio_snapshots.date) AS last_update
      FROM
        portfolio_snapshots
      GROUP BY
        portfolio_snapshots.user_id,
        portfolio_snapshots.symbol
    ) up ON (
      (
        (t.user_id = up.user_id)
        AND (t.symbol = up.symbol)
      )
    )
  )
WHERE
  (
    t.transaction_date > COALESCE(up.last_update, '1900-01-01' :: date)
  )
GROUP BY
  t.user_id,
  t.symbol;