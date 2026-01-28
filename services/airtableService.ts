import { AirtableRecord, AirtableRecordFields, AirtableTableSchema } from '../types';
import { STATUS_FIELD_NAME, STATUS_TODO } from '../constants';

const API_BASE = 'https://api.airtable.com/v0';

export class AirtableService {
  private apiKey: string;
  private baseId: string;

  constructor(apiKey: string, baseId: string) {
    this.apiKey = apiKey;
    this.baseId = baseId;
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  async fetchRecords(tableName: string, view?: string): Promise<AirtableRecord[]> {
    try {
      const encodedTable = encodeURIComponent(tableName);
      // Removed server-side sort to prevent 422 errors if 'Created' field doesn't exist.
      // We sort client-side using the record metadata 'createdTime'.
      const url = `${API_BASE}/${this.baseId}/${encodedTable}?maxRecords=50`;
      
      const response = await fetch(url, {
        headers: this.headers
      });

      if (!response.ok) {
        let errorMessage = response.statusText || `Status ${response.status}`;
        try {
            const errorBody = await response.json();
            // Airtable standard error format: { error: { type: "...", message: "..." } }
            if (errorBody.error) {
                errorMessage = errorBody.error.message || JSON.stringify(errorBody.error);
            }
        } catch (e) {
            // Ignore JSON parsing error, use status text
        }
        throw new Error(`${errorMessage}`);
      }

      const data = await response.json();
      
      // Client-side sort: Newest first
      return data.records.sort((a: AirtableRecord, b: AirtableRecord) => 
        new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
      );
    } catch (error) {
      console.error("Fetch records error:", error);
      throw error;
    }
  }

  async createRecord(tableName: string, fields: AirtableRecordFields): Promise<AirtableRecord> {
    try {
      // Auto-set status to Todo if not provided
      const payload = {
        fields: {
          ...fields,
          [STATUS_FIELD_NAME]: STATUS_TODO
        }
      };

      const response = await fetch(`${API_BASE}/${this.baseId}/${encodeURIComponent(tableName)}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        const errorMessage = err.error?.message || err.error || 'Failed to create record';
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error("Create record error:", error);
      throw error;
    }
  }

  async updateRecord(tableName: string, recordId: string, fields: AirtableRecordFields): Promise<void> {
    try {
        const response = await fetch(`${API_BASE}/${this.baseId}/${encodeURIComponent(tableName)}/${recordId}`, {
            method: 'PATCH',
            headers: this.headers,
            body: JSON.stringify({ fields })
        });

        if (!response.ok) {
            const err = await response.json();
            const errorMessage = err.error?.message || err.error || 'Failed to update record';
            throw new Error(errorMessage);
        }
    } catch(error) {
        console.error(error);
        throw error;
    }
  }

  async getTableSchema(tableName: string): Promise<AirtableTableSchema | null> {
    try {
      const response = await fetch(`https://api.airtable.com/v0/meta/bases/${this.baseId}/tables`, {
        headers: this.headers
      });

      if (!response.ok) {
        console.error('Failed to fetch table schema:', response.statusText);
        return null;
      }

      const data = await response.json();
      const table = data.tables?.find((t: AirtableTableSchema) => t.name === tableName);

      return table || null;
    } catch (error) {
      console.error('Error fetching table schema:', error);
      return null;
    }
  }
}