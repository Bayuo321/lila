package lila.local

case class GameSetup(
    white: Option[String],
    black: Option[String],
    fen: Option[String],
    time: Option[String],
    go: Boolean = false
)
