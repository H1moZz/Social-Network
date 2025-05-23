"""empty message

Revision ID: d7ed8b5e92b8
Revises: 2f3e49474727
Create Date: 2025-05-13 18:14:57.574610

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd7ed8b5e92b8'
down_revision = '2f3e49474727'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('message', schema=None) as batch_op:
        batch_op.add_column(sa.Column('media_ptah', sa.String(length=200), nullable=True))
        batch_op.alter_column('content',
               existing_type=sa.TEXT(),
               nullable=True)
        batch_op.drop_column('media_url')

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('message', schema=None) as batch_op:
        batch_op.add_column(sa.Column('media_url', sa.VARCHAR(length=200), nullable=True))
        batch_op.alter_column('content',
               existing_type=sa.TEXT(),
               nullable=False)
        batch_op.drop_column('media_ptah')

    # ### end Alembic commands ###
