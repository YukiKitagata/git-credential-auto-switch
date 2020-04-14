## git-credential-auto-switch

Git のアカウントを自動で切り替える `git credential helper` です。

## セットアップ

Releases からバイナリーを落とし、 `PATH` の通っている所に `git-credential-auto-switch` として保存します。

次に、以下の Git コマンドを実行してセットアップは完了です。

```
git config --global credential.helper auto-switch
```

### Mac + Xcode環境の場合

Xcode付属の `gitconfig` がある場合、 `credential.helper` が `osxkeychain` に上書きされてしまいます。

以下のコマンドで削除することにより、正常に動作します。

```
sudo rm /Applications/Xcode.app/Contents/Developer/usr/share/git-core/gitconfig
```

## 使い方

`origin` が**https**のリポジトリ内で、通常通りにユーザーネームとパスワードを入力するだけで、パスワードの保存・切り替えが行われます。

## 仕組み

`origin` から、リポジトリのユーザー名 (e.g. `https://github.com/<Username>/<repository>` ) を検出し、検出されたユーザー名によって、Git のユーザー名とパスワードを切り替えます。

(GitHub 以外にも、`https://hoge.com/<Username>/hoge/fuga` のように 1 つ目の階層で振り分けできるサービスなら動作します。)

保存されたユーザー名とパスワードは、 `$HOME/.git-credential-auto-switch.yaml` に保存されます。

**保存されるパスワードは、プレーンテキストになっているので取り扱いには注意してください。**
