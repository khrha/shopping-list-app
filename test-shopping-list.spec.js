const { test, expect } = require('@playwright/test');
const path = require('path');

const HTML_FILE = 'file:///' + path.resolve(__dirname, 'shopping-list.html').replace(/\\/g, '/');

test.describe('쇼핑 리스트 앱 테스트', () => {

  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 로컬 스토리지 초기화
    await page.goto(HTML_FILE);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('페이지가 올바르게 로드되는지 확인', async ({ page }) => {
    await page.goto(HTML_FILE);

    // 제목 확인
    const title = await page.locator('h1').textContent();
    expect(title).toContain('쇼핑 리스트');

    // 입력창과 버튼 확인
    await expect(page.locator('#itemInput')).toBeVisible();
    await expect(page.locator('#addBtn')).toBeVisible();

    // 초기 상태 확인
    const emptyMessage = await page.locator('.empty-message').textContent();
    expect(emptyMessage).toContain('아이템이 없습니다');
  });

  test('아이템 추가 기능 테스트', async ({ page }) => {
    await page.goto(HTML_FILE);

    // 아이템 입력 및 추가
    await page.fill('#itemInput', '사과');
    await page.click('#addBtn');

    // 아이템이 리스트에 추가되었는지 확인
    const itemText = await page.locator('.item-text').first().textContent();
    expect(itemText).toBe('사과');

    // 입력창이 비워졌는지 확인
    const inputValue = await page.locator('#itemInput').inputValue();
    expect(inputValue).toBe('');

    // 통계 업데이트 확인
    const totalItems = await page.locator('#totalItems').textContent();
    expect(totalItems).toContain('총 1개 항목');
  });

  test('Enter 키로 아이템 추가 테스트', async ({ page }) => {
    await page.goto(HTML_FILE);

    await page.fill('#itemInput', '바나나');
    await page.press('#itemInput', 'Enter');

    const itemText = await page.locator('.item-text').first().textContent();
    expect(itemText).toBe('바나나');
  });

  test('빈 값 입력 방지 테스트', async ({ page }) => {
    await page.goto(HTML_FILE);

    // alert 핸들러 설정
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('아이템을 입력해주세요');
      await dialog.accept();
    });

    // 빈 값으로 추가 시도
    await page.click('#addBtn');

    // 아이템이 추가되지 않았는지 확인
    await expect(page.locator('.empty-message')).toBeVisible();
  });

  test('여러 아이템 추가 테스트', async ({ page }) => {
    await page.goto(HTML_FILE);

    const items = ['사과', '바나나', '우유', '빵'];

    for (const item of items) {
      await page.fill('#itemInput', item);
      await page.click('#addBtn');
    }

    // 모든 아이템이 추가되었는지 확인
    const itemTexts = await page.locator('.item-text').allTextContents();
    expect(itemTexts).toEqual(items);

    // 통계 확인
    const totalItems = await page.locator('#totalItems').textContent();
    expect(totalItems).toContain('총 4개 항목');
  });

  test('아이템 체크 기능 테스트', async ({ page }) => {
    await page.goto(HTML_FILE);

    // 아이템 추가
    await page.fill('#itemInput', '달걀');
    await page.click('#addBtn');

    // 체크박스 클릭
    await page.locator('.checkbox').first().check();

    // 체크된 상태 확인
    const isChecked = await page.locator('.checkbox').first().isChecked();
    expect(isChecked).toBe(true);

    // checked 클래스 확인
    const hasCheckedClass = await page.locator('.shopping-item').first().evaluate(el => el.classList.contains('checked'));
    expect(hasCheckedClass).toBe(true);

    // 통계 업데이트 확인
    const checkedItems = await page.locator('#checkedItems').textContent();
    expect(checkedItems).toContain('완료 1개');
  });

  test('아이템 체크 해제 기능 테스트', async ({ page }) => {
    await page.goto(HTML_FILE);

    // 아이템 추가 및 체크
    await page.fill('#itemInput', '토마토');
    await page.click('#addBtn');
    await page.locator('.checkbox').first().check();

    // 체크 해제
    await page.locator('.checkbox').first().uncheck();

    // 체크 해제 상태 확인
    const isChecked = await page.locator('.checkbox').first().isChecked();
    expect(isChecked).toBe(false);

    // 통계 확인
    const checkedItems = await page.locator('#checkedItems').textContent();
    expect(checkedItems).toContain('완료 0개');
  });

  test('아이템 삭제 기능 테스트', async ({ page }) => {
    await page.goto(HTML_FILE);

    // 아이템 추가
    await page.fill('#itemInput', '치즈');
    await page.click('#addBtn');

    // 삭제 버튼 클릭
    await page.locator('.delete-btn').first().click();

    // 아이템이 삭제되었는지 확인
    await expect(page.locator('.empty-message')).toBeVisible();

    // 통계 확인
    const totalItems = await page.locator('#totalItems').textContent();
    expect(totalItems).toContain('총 0개 항목');
  });

  test('여러 아이템 중 특정 아이템 삭제 테스트', async ({ page }) => {
    await page.goto(HTML_FILE);

    // 여러 아이템 추가
    const items = ['사과', '바나나', '우유'];
    for (const item of items) {
      await page.fill('#itemInput', item);
      await page.click('#addBtn');
    }

    // 두 번째 아이템 삭제 (바나나)
    await page.locator('.delete-btn').nth(1).click();

    // 남은 아이템 확인
    const remainingItems = await page.locator('.item-text').allTextContents();
    expect(remainingItems).toEqual(['사과', '우유']);

    // 통계 확인
    const totalItems = await page.locator('#totalItems').textContent();
    expect(totalItems).toContain('총 2개 항목');
  });

  test('로컬 스토리지 저장 테스트', async ({ page }) => {
    await page.goto(HTML_FILE);

    // 아이템 추가
    await page.fill('#itemInput', '감자');
    await page.click('#addBtn');

    // 로컬 스토리지에 저장되었는지 확인
    const storedData = await page.evaluate(() => {
      return localStorage.getItem('shoppingList');
    });

    expect(storedData).toBeTruthy();
    const parsedData = JSON.parse(storedData);
    expect(parsedData.length).toBe(1);
    expect(parsedData[0].text).toBe('감자');
  });

  test('로컬 스토리지에서 데이터 복원 테스트', async ({ page }) => {
    await page.goto(HTML_FILE);

    // 아이템 추가
    await page.fill('#itemInput', '양파');
    await page.click('#addBtn');
    await page.fill('#itemInput', '마늘');
    await page.click('#addBtn');

    // 페이지 새로고침
    await page.reload();

    // 데이터가 복원되었는지 확인
    const itemTexts = await page.locator('.item-text').allTextContents();
    expect(itemTexts).toEqual(['양파', '마늘']);

    const totalItems = await page.locator('#totalItems').textContent();
    expect(totalItems).toContain('총 2개 항목');
  });

  test('체크 상태 로컬 스토리지 저장 및 복원 테스트', async ({ page }) => {
    await page.goto(HTML_FILE);

    // 아이템 추가 및 체크
    await page.fill('#itemInput', '콜라');
    await page.click('#addBtn');
    await page.locator('.checkbox').first().check();

    // 페이지 새로고침
    await page.reload();

    // 체크 상태가 유지되는지 확인
    const isChecked = await page.locator('.checkbox').first().isChecked();
    expect(isChecked).toBe(true);

    const checkedItems = await page.locator('#checkedItems').textContent();
    expect(checkedItems).toContain('완료 1개');
  });

  test('통합 시나리오 테스트', async ({ page }) => {
    await page.goto(HTML_FILE);

    // 1. 여러 아이템 추가
    const items = ['사과', '바나나', '우유', '빵', '달걀'];
    for (const item of items) {
      await page.fill('#itemInput', item);
      await page.click('#addBtn');
    }

    // 2. 일부 아이템 체크
    await page.locator('.checkbox').nth(0).check(); // 사과
    await page.locator('.checkbox').nth(2).check(); // 우유
    await page.locator('.checkbox').nth(4).check(); // 달걀

    // 통계 확인
    let totalItems = await page.locator('#totalItems').textContent();
    let checkedItems = await page.locator('#checkedItems').textContent();
    expect(totalItems).toContain('총 5개 항목');
    expect(checkedItems).toContain('완료 3개');

    // 3. 체크된 아이템 하나 삭제
    await page.locator('.delete-btn').nth(0).click(); // 사과 삭제

    // 통계 재확인
    totalItems = await page.locator('#totalItems').textContent();
    checkedItems = await page.locator('#checkedItems').textContent();
    expect(totalItems).toContain('총 4개 항목');
    expect(checkedItems).toContain('완료 2개');

    // 4. 페이지 새로고침 후 데이터 복원 확인
    await page.reload();

    const remainingItems = await page.locator('.item-text').allTextContents();
    expect(remainingItems).toEqual(['바나나', '우유', '빵', '달걀']);

    totalItems = await page.locator('#totalItems').textContent();
    checkedItems = await page.locator('#checkedItems').textContent();
    expect(totalItems).toContain('총 4개 항목');
    expect(checkedItems).toContain('완료 2개');
  });

  test('UI 요소 스타일 확인', async ({ page }) => {
    await page.goto(HTML_FILE);

    // 아이템 추가
    await page.fill('#itemInput', '테스트 아이템');
    await page.click('#addBtn');

    // 체크되지 않은 아이템 스타일
    const itemNotChecked = page.locator('.shopping-item').first();
    await expect(itemNotChecked).not.toHaveClass(/checked/);

    // 체크된 아이템 스타일
    await page.locator('.checkbox').first().check();
    await expect(itemNotChecked).toHaveClass(/checked/);
  });
});
