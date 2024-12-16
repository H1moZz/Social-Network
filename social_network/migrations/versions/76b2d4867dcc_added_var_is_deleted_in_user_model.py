"""Added var is_deleted in User model

Revision ID: 76b2d4867dcc
Revises: 953cdf84955c
Create Date: 2024-12-13 18:01:52.839588

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '76b2d4867dcc'
down_revision = '953cdf84955c'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_deleted', sa.Boolean(), nullable=True))

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('is_deleted')

    # ### end Alembic commands ###
