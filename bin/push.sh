#!/bin/bash

# Получаем текущую ветку
CURRENT_BRANCH=$(git branch --show-current)

# Запрашиваем ветку
read -p "Введите имя ветки для пуша (Enter = $CURRENT_BRANCH): " BRANCH
BRANCH=${BRANCH:-$CURRENT_BRANCH}

echo ""
echo "Выбрана ветка: $BRANCH"

# Получаем список удалённых репозиториев
REPOS=($(git remote))
REPO_COUNT=${#REPOS[@]}

if [ "$REPO_COUNT" -eq 0 ]; then
    echo "Нет удалённых репозиториев."
    exit 1
fi

# Выводим список репозиториев
echo "Доступные репозитории:"
for i in "${!REPOS[@]}"; do
    echo "$((i+1)) - ${REPOS[$i]}"
done

# Запрашиваем выбор
read -p "Выберите репозиторий по номеру (Enter = все): " CHOICE

# Проверяем, был ли введён номер
if [[ "$CHOICE" =~ ^[0-9]+$ && "$CHOICE" -ge 1 && "$CHOICE" -le "$REPO_COUNT" ]]; then
    SELECTED_REPO="${REPOS[$((CHOICE-1))]}"
    echo ""
    echo "Пушим только в репозиторий: $SELECTED_REPO"
    REMOTES_TO_PUSH=("$SELECTED_REPO")
else
    echo ""
    echo "Пушим во все репозитории:"
    REMOTES_TO_PUSH=("${REPOS[@]}")
fi

SUCCESS_COUNT=0
FAILED_COUNT=0

for REMOTE in "${REMOTES_TO_PUSH[@]}"; do
    echo "Пушим в $REMOTE на ветку $BRANCH..."

    # Проверяем доступность репозитория
    if ! git ls-remote "$REMOTE" &> /dev/null; then
        echo "❌ Репозиторий $REMOTE недоступен. Пропускаем..."
        ((FAILED_COUNT++))
        continue
    fi

    # Выполняем пуш
    if git push "$REMOTE" "$BRANCH"; then
        echo "✅ Успешно отправлено в $REMOTE"
        ((SUCCESS_COUNT++))
    else
        echo "❌ Ошибка при пуш в $REMOTE"
        ((FAILED_COUNT++))
    fi
done

echo ""
echo "📊 Статистика:"
echo "✅ Успешно: $SUCCESS_COUNT репозиториев"
echo "❌ Неудачно: $FAILED_COUNT репозиториев"
echo "=== Синхронизация завершена ==="