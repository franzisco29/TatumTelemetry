import openpyxl
from openpyxl import Workbook

headers = [
    'username', 'password', 'role', 'platform', 'team_category', 'is_admin', 'is_superuser', 'division_id'
]
data = [
    ['mario.rossi',   'Password1!', 'driver',   'PC', 'Main',     'false', 'false', ''],
    ['luigi.bianchi', 'Password2!', 'engineer', '',   'Next Gen', 'false', 'false', ''],
]

wb = Workbook()
ws = wb.active
ws.title = 'Users'
ws.append(headers)
for row in data:
    ws.append(row)
for col in ws.columns:
    max_length = max(len(str(cell.value)) if cell.value else 0 for cell in col)
    ws.column_dimensions[col[0].column_letter].width = max_length + 2
wb.save('tatum_users_template.xlsx')
print('Creato tatum_users_template.xlsx')
